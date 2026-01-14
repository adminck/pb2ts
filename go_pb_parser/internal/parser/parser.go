package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
	"google.golang.org/genproto/googleapis/api/annotations"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/descriptorpb"

	"github.com/adminck/pb2ts/internal/types"
)

// Parser 用于解析 Protocol Buffer 文件的主解析器
type Parser struct {
	importPaths  []string
	excludePaths map[string]string
}

// NewParser 创建一个新的解析器
func NewParser(importPaths []string, excludePaths []string) (*Parser, error) {
	p := &Parser{
		importPaths:  make([]string, 0),
		excludePaths: make(map[string]string),
	}
	for _, path := range importPaths {
		aPath, err := abs(path)
		if err != nil {
			return nil, err
		}
		p.importPaths = append(p.importPaths, aPath)
	}
	for _, path := range excludePaths {
		aPath, err := abs(path)
		if err != nil {
			return nil, err
		}
		p.excludePaths[aPath] = aPath
	}
	return p, nil
}

// ParseServices 解析指定目录中的所有 proto 文件并提取服务
func (p *Parser) ParseServices(protoPath string) ([]*types.Service, error) {
	dir, err := abs(protoPath)
	if err != nil {
		return nil, err
	}

	pa := &protoparse.Parser{
		IncludeSourceCodeInfo: true,
		ImportPaths:           append(p.importPaths, dir),
	}

	files, err := listProtoFiles(protoPath, p.excludePaths)
	if err != nil {
		return nil, fmt.Errorf("列出 proto 文件失败: %w", err)
	}

	var services []*types.Service
	for _, file := range files {
		fds, err := pa.ParseFiles(file)
		if err != nil {
			return nil, fmt.Errorf("解析文件 %s 失败: %w", file, err)
		}

		for _, fd := range fds {
			for _, descriptor := range fd.GetServices() {
				service := p.ParseService(descriptor)
				services = append(services, service)
			}
		}
	}

	return services, nil
}

// ParseService 解析一个服务描述符
func (p *Parser) ParseService(srv *desc.ServiceDescriptor) *types.Service {
	service := types.NewService()
	service.Name = srv.GetName()
	if srv.GetSourceInfo() != nil {
		service.LeadingComments = srv.GetSourceInfo().GetLeadingComments()
	}

	for _, method := range srv.GetMethods() {
		p.ParseMethod(method, service)
	}

	return service
}

// ParseMethod 解析一个 RPC 方法
func (p *Parser) ParseMethod(method *desc.MethodDescriptor, service *types.Service) {
	// 跳过流式方法
	if method.IsServerStreaming() || method.IsClientStreaming() {
		return
	}

	ext := proto.GetExtension(method.GetMethodOptions(), annotations.E_Http)
	methodStr, path, err := p.ParseHTTPRule(ext)
	if err != nil {
		// 如果没有 HTTP 注解，跳过该方法
		return
	}

	rpc := &types.RPC{
		Name:    method.GetName(),
		Method:  methodStr,
		Path:    path,
		Request: method.GetInputType().GetName(),
		Resp:    method.GetOutputType().GetName(),
	}

	if method.GetSourceInfo() != nil && method.GetSourceInfo().LeadingComments != nil {
		rpc.LeadingComments = *method.GetSourceInfo().LeadingComments
	}

	// 解析请求和响应消息
	p.ParseMessage(method.GetInputType(), "", false, service)
	p.ParseMessage(method.GetOutputType(), "", false, service)

	service.RPC = append(service.RPC, rpc)
}

// ParseHTTPRule 从 HTTP 注解中提取方法和路径
func (p *Parser) ParseHTTPRule(ext interface{}) (string, string, error) {
	rule, ok := ext.(*annotations.HttpRule)
	if !ok {
		return "", "", fmt.Errorf("无效的 HTTP 注解")
	}

	var method, path string
	switch httpRule := rule.GetPattern().(type) {
	case *annotations.HttpRule_Get:
		method = "GET"
		path = p.adjustHTTPPath(httpRule.Get)
	case *annotations.HttpRule_Post:
		method = "POST"
		path = p.adjustHTTPPath(httpRule.Post)
	case *annotations.HttpRule_Put:
		method = "PUT"
		path = p.adjustHTTPPath(httpRule.Put)
	case *annotations.HttpRule_Delete:
		method = "DELETE"
		path = p.adjustHTTPPath(httpRule.Delete)
	case *annotations.HttpRule_Patch:
		method = "PATCH"
		path = p.adjustHTTPPath(httpRule.Patch)
	default:
		return "", "", fmt.Errorf("不支持的 HTTP 方法")
	}

	return method, path, nil
}

// adjustHTTPPath 调整 HTTP 路径格式（将 {id} 转换为 :id）
func (p *Parser) adjustHTTPPath(path string) string {
	path = strings.ReplaceAll(path, "{", ":")
	path = strings.ReplaceAll(path, "}", "")
	return path
}

// ParseMessage 解析一个消息类型
func (p *Parser) ParseMessage(msg *desc.MessageDescriptor, parentName string, isNested bool, service *types.Service) {
	msgInfo := &types.Message{
		Name:            msg.GetName(),
		LeadingComments: "",
		Fields:          make([]*types.Field, 0),
	}

	if msg.GetSourceInfo() != nil {
		msgInfo.LeadingComments = msg.GetSourceInfo().GetLeadingComments()
	}

	if isNested {
		msgInfo.Name = fmt.Sprintf("%s_%s", parentName, msg.GetName())
	}

	// 检查是否已解析过
	if service.IsMsgMap(msgInfo.Name) {
		return
	}

	service.SetMsgMap(msgInfo.Name, len(service.Message))

	// 解析字段
	for _, field := range msg.GetFields() {
		fieldInfo := p.ParseField(field, msgInfo, service)
		msgInfo.Fields = append(msgInfo.Fields, fieldInfo)
	}

	service.Message = append(service.Message, msgInfo)
}

// ParseField 解析一个字段
func (p *Parser) ParseField(field *desc.FieldDescriptor, msgInfo *types.Message, service *types.Service) *types.Field {
	fieldInfo := &types.Field{
		Name:            field.GetJSONName(),
		Type:            field.GetType().String(),
		LeadingComments: "",
	}

	if field.GetSourceInfo() != nil {
		fieldInfo.LeadingComments = field.GetSourceInfo().GetLeadingComments()
	}

	if field.IsMap() {
		fieldInfo.IsMap = true
		fieldInfo.MapKey = field.GetMapKeyType().GetType().String()
	}

	if field.IsRepeated() {
		fieldInfo.IsRepeated = true
	}

	isMapValueTypeEnum := field.IsMap() && field.GetMapValueType().GetType() == descriptorpb.FieldDescriptorProto_TYPE_ENUM
	isMapValueTypeMessage := field.IsMap() && field.GetMapValueType().GetType() == descriptorpb.FieldDescriptorProto_TYPE_MESSAGE

	switch {
	case field.GetType() == descriptorpb.FieldDescriptorProto_TYPE_ENUM, isMapValueTypeEnum:
		tempField := field
		if isMapValueTypeEnum {
			tempField = field.GetMapValueType()
		}
		nested := !strings.Contains(tempField.GetEnumType().GetParent().GetName(), ".proto")
		if nested {
			fieldInfo.MapValue = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetEnumType().GetName())
			fieldInfo.TypeName = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetEnumType().GetName())
			p.ParseEnum(tempField.GetEnumType(), msgInfo.Name, true, service)
		} else {
			fieldInfo.MapValue = tempField.GetEnumType().GetName()
			fieldInfo.TypeName = tempField.GetEnumType().GetName()
			p.ParseEnum(tempField.GetEnumType(), "", false, service)
		}

	case field.GetType() == descriptorpb.FieldDescriptorProto_TYPE_MESSAGE, isMapValueTypeMessage:
		tempField := field
		if isMapValueTypeMessage {
			tempField = field.GetMapValueType()
		}
		nested := !strings.Contains(tempField.GetMessageType().GetParent().GetName(), ".proto")

		switch tempField.GetMessageType().GetName() {
		case "Timestamp":
			fieldInfo.Type = "TYPE_STRING"
			fieldInfo.MapValue = "TYPE_STRING"
			return fieldInfo
		default:
			fieldInfo.TypeName = tempField.GetMessageType().GetName()
			if nested {
				fieldInfo.TypeName = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetMessageType().GetName())
				fieldInfo.MapValue = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetMessageType().GetName())
			}
		}

		if nested {
			p.ParseMessage(tempField.GetMessageType(), msgInfo.Name, true, service)
		} else {
			p.ParseMessage(tempField.GetMessageType(), "", false, service)
		}
	}

	return fieldInfo
}

// ParseEnum 解析一个枚举类型
func (p *Parser) ParseEnum(enum *desc.EnumDescriptor, parentName string, isNested bool, service *types.Service) {
	enumInfo := &types.Enum{
		Name:            enum.GetName(),
		LeadingComments: "",
		EnumItems:       make([]*types.EnumItem, 0),
	}

	if enum.GetSourceInfo() != nil {
		enumInfo.LeadingComments = enum.GetSourceInfo().GetLeadingComments()
	}

	if isNested {
		enumInfo.Name = fmt.Sprintf("%s_%s", parentName, enum.GetName())
	}

	for _, v := range enum.GetValues() {
		item := &types.EnumItem{
			Key:   v.GetName(),
			Value: v.GetNumber(),
		}
		if v.GetSourceInfo() != nil {
			item.LeadingComments = v.GetSourceInfo().GetLeadingComments()
		}
		enumInfo.EnumItems = append(enumInfo.EnumItems, item)
	}

	service.Enums = append(service.Enums, enumInfo)
}

// listProtoFiles 列出指定目录中的所有 proto 文件
func listProtoFiles(dir string, excludePaths map[string]string) ([]string, error) {
	var files []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		entryPath, err := filepath.Abs(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, err
		}

		// 检查是否是排除路径
		if _, ok := excludePaths[entryPath]; ok {
			continue
		}

		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".proto") {
			files = append(files, entry.Name())
		}
	}

	return files, nil
}

func abs(path string) (string, error) {
	return filepath.Abs(path)
}
