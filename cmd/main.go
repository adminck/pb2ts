package main

import (
	"bytes"
	"errors"
	"fmt"
	"github.com/dop251/goja"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
	"google.golang.org/genproto/googleapis/api/annotations"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/descriptorpb"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"text/template"
)

var vm = goja.New()

type Message struct {
	Name            string
	LeadingComments string
	Fields          []*Field
}

type Field struct {
	Name            string
	Type            string
	TypeName        string
	LeadingComments string
	IsMap           bool
	IsRepeated      bool
	MapKey          string
	MapValue        string
}

type Service struct {
	Name            string
	LeadingComments string
	Message         []*Message
	RPC             []*Rpc
	Enums           []*Enum
	msgMap          *sync.Map
}

func (s *Service) SetMsgMap(msgName string, index int) {
	s.msgMap.Store(msgName, index)
}

func (s *Service) IsMsgMap(msgName string) bool {
	_, is := s.msgMap.Load(msgName)
	return is
}

type Enum struct {
	Name            string
	LeadingComments string
	EnumItems       []*EnumItem
}

type EnumItem struct {
	Key             string
	Value           int32
	LeadingComments string
}

type Rpc struct {
	Name            string `json:"name"`
	LeadingComments string `json:"leadingComments"`
	Method          string `json:"method"`
	Path            string `json:"path"`
	Request         string `json:"Request"`
	Resp            string `json:"resp"`
}

func main() {
	loadCfg()
	// 解析.proto文件
	pa := &protoparse.Parser{
		IncludeSourceCodeInfo: true,
		ImportPaths: []string{
			"./",
		},
	}
	pa.ImportPaths = append(pa.ImportPaths, config.ImportProtoFilePath...)

	// 读取文件夹内的所有文件和文件夹
	files, err := ioutil.ReadDir(config.ProtoFilePath)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	srvs := make([]*Service, 0)

	// 遍历并打印出所有文件和子文件夹的名字
	for _, file := range files {
		if !file.IsDir() && strings.Contains(file.Name(), ".proto") {
			fds, err := pa.ParseFiles(fmt.Sprintf("%s/%s", config.ProtoFilePath, file.Name()))
			if err != nil {
				panic(err)
			}
			for _, fd := range fds {
				for _, descriptor := range fd.GetServices() {
					srvs = append(srvs, ServicesParser(descriptor))
				}
			}
		}
	}

	for _, srv := range srvs {
		WriteTsFile(srv)
	}
}

func ServicesParser(srv *desc.ServiceDescriptor) *Service {
	srvInfo := &Service{
		Name:            srv.GetName(),
		LeadingComments: srv.GetSourceInfo().GetLeadingComments(),
		RPC:             make([]*Rpc, 0),
		Message:         make([]*Message, 0),
		msgMap:          &sync.Map{},
	}

	for _, descriptor := range srv.GetMethods() {
		MethodsParser(descriptor, srvInfo)
	}

	return srvInfo
}

func adjustHttpPath(path string) string {
	path = strings.ReplaceAll(path, "{", ":")
	path = strings.ReplaceAll(path, "}", "")
	return path
}

func GetHttpMethodAndPath(ext interface{}) (string, string, error) {
	switch rule := ext.(type) {
	case *annotations.HttpRule:
		switch httpRule := rule.GetPattern().(type) {
		case *annotations.HttpRule_Get:
			return http.MethodGet, adjustHttpPath(httpRule.Get), nil
		case *annotations.HttpRule_Post:
			return http.MethodPost, adjustHttpPath(httpRule.Post), nil
		case *annotations.HttpRule_Put:
			return http.MethodPut, adjustHttpPath(httpRule.Put), nil
		case *annotations.HttpRule_Delete:
			return http.MethodDelete, adjustHttpPath(httpRule.Delete), nil
		case *annotations.HttpRule_Patch:
			return http.MethodPatch, adjustHttpPath(httpRule.Patch), nil
		default:
			return "", "", errors.New("HttpMethod is not")
		}
	default:
		return "", "", errors.New("HttpMethod is not")
	}
}

func MethodsParser(method *desc.MethodDescriptor, srv *Service) {
	if method.IsServerStreaming() || method.IsClientStreaming() {
		fmt.Println("Stream")
		return
	}

	ext := proto.GetExtension(method.GetMethodOptions(), annotations.E_Http)

	methodstr, path, err := GetHttpMethodAndPath(ext)
	if err != nil {
		return
	}

	rpcInfo := &Rpc{
		Name:            method.GetName(),
		LeadingComments: *method.GetSourceInfo().LeadingComments,
		Method:          methodstr,
		Path:            path,
		Request:         method.GetInputType().GetName(),
		Resp:            method.GetOutputType().GetName(),
	}

	MessageParser(method.GetInputType(), "", false, srv)
	MessageParser(method.GetOutputType(), "", false, srv)

	srv.RPC = append(srv.RPC, rpcInfo)
}

const (
	Timestamp = "Timestamp"
)

func MessageParser(msg *desc.MessageDescriptor, parentName string, isNested bool, srv *Service) {
	msgInfo := &Message{
		Name:            msg.GetName(),
		LeadingComments: msg.GetSourceInfo().GetLeadingComments(),
		Fields:          make([]*Field, 0),
	}
	if isNested {
		msgInfo.Name = fmt.Sprintf("%s_%s", parentName, msg.GetName())
	}

	if srv.IsMsgMap(msgInfo.Name) {
		return
	}

	srv.SetMsgMap(msgInfo.Name, len(srv.Message))

	for _, field := range msg.GetFields() {
		fieldInfo := &Field{
			Name:            field.GetJSONName(),
			Type:            field.GetType().String(),
			LeadingComments: field.GetSourceInfo().GetLeadingComments(),
		}
		if field.IsMap() {
			fieldInfo.IsMap = true
			fieldInfo.MapKey = field.GetMapKeyType().GetType().String()
		}
		if field.IsRepeated() {
			fieldInfo.IsRepeated = true
		}

		isMapValveTypeEnum := field.IsMap() && field.GetMapValueType().GetType() == descriptorpb.FieldDescriptorProto_TYPE_ENUM
		isMapValveTypeMessage := field.IsMap() && field.GetMapValueType().GetType() == descriptorpb.FieldDescriptorProto_TYPE_MESSAGE

		switch {
		case field.GetType() == descriptorpb.FieldDescriptorProto_TYPE_ENUM, isMapValveTypeEnum:
			tempField := field
			if isMapValveTypeEnum {
				tempField = field.GetMapValueType()
			}
			nested := !strings.Contains(tempField.GetEnumType().GetParent().GetName(), ".proto")
			if nested {
				fieldInfo.MapValue = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetEnumType().GetName())
				fieldInfo.TypeName = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetEnumType().GetName())
				ENUMParser(tempField.GetEnumType(), msgInfo.Name, true, srv)
			} else {
				fieldInfo.MapValue = tempField.GetEnumType().GetName()
				fieldInfo.TypeName = tempField.GetEnumType().GetName()
				ENUMParser(tempField.GetEnumType(), "", false, srv)
			}
		case field.GetType() == descriptorpb.FieldDescriptorProto_TYPE_MESSAGE, isMapValveTypeMessage:
			tempField := field
			if isMapValveTypeMessage {
				tempField = field.GetMapValueType()
			}
			nested := !strings.Contains(tempField.GetMessageType().GetParent().GetName(), ".proto")

			switch tempField.GetMessageType().GetName() {
			case Timestamp:
				fieldInfo.Type = "TYPE_STRING"
				fieldInfo.MapValue = "TYPE_STRING"
				msgInfo.Fields = append(msgInfo.Fields, fieldInfo)
				continue
			default:
				fieldInfo.TypeName = tempField.GetMessageType().GetName()
				if nested {
					fieldInfo.TypeName = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetMessageType().GetName())
					fieldInfo.MapValue = fmt.Sprintf("%s_%s", msgInfo.Name, tempField.GetMessageType().GetName())
				}
			}
			if nested {
				MessageParser(tempField.GetMessageType(), msgInfo.Name, true, srv)
			} else {
				MessageParser(tempField.GetMessageType(), "", false, srv)
			}
		default:
		}

		msgInfo.Fields = append(msgInfo.Fields, fieldInfo)
	}
	srv.Message = append(srv.Message, msgInfo)
}

func ENUMParser(enum *desc.EnumDescriptor, parentName string, isNested bool, srv *Service) {
	enumInfo := &Enum{
		Name:            enum.GetName(),
		LeadingComments: enum.GetSourceInfo().GetLeadingComments(),
		EnumItems:       make([]*EnumItem, 0),
	}

	if isNested {
		enumInfo.Name = fmt.Sprintf("%s_%s", parentName, enum.GetName())
	}

	for _, v := range enum.GetValues() {
		enumInfo.EnumItems = append(enumInfo.EnumItems, &EnumItem{
			Key:             v.GetName(),
			Value:           v.GetNumber(),
			LeadingComments: v.GetSourceInfo().GetLeadingComments(),
		})

	}

	srv.Enums = append(srv.Enums, enumInfo)
}

type TsConfig struct {
	ImportFrom          []string          `yaml:"importFrom"`
	ImportProtoFilePath []string          `yaml:"importProtoFilePath"`
	ApiTemplate         string            `yaml:"ApiTemplate"`
	ProtoFilePath       string            `yaml:"protoFilePath"`
	FuncCall            map[string]string `yaml:"FuncCall"`
}

var config TsConfig

func loadCfg() {
	// 从文件中读取YAML内容
	data, err := ioutil.ReadFile("config.yaml")
	if err != nil {
		log.Fatal(err)
	}

	err = yaml.Unmarshal(data, &config)
	if err != nil {
		log.Fatalf("Failed to parse YAML file: %v", err)
	}
}

func WriteTsFile(srv *Service) {
	var buf bytes.Buffer

	for _, s := range config.ImportFrom {
		buf.WriteString(s)
		buf.WriteString("\n")
	}

	buf.WriteString("\n")
	buf.WriteString("\n")

	t := template.New("test")
	t, _ = t.Parse(config.ApiTemplate)
	for _, rpc := range srv.RPC {
		if str, ok := config.FuncCall[rpc.Name]; ok {
			_, err := vm.RunString(str)
			sum, ok := goja.AssertFunction(vm.Get("funcCall"))
			if !ok {
				panic("Not a function")
			}
			res, err := sum(goja.Undefined(),
				vm.ToValue(rpc.LeadingComments),
				vm.ToValue(rpc.Name),
				vm.ToValue(rpc.Request),
				vm.ToValue(rpc.Resp),
				vm.ToValue(rpc.Method),
				vm.ToValue(rpc.Path),
			)
			if err != nil {
				panic(err)
			}
			buf.WriteString(res.String())
			buf.WriteString("\n")
			continue
		}

		err := t.Execute(&buf, rpc)
		if err != nil {
			log.Fatal(err)
		}
		buf.WriteString("\n")
	}

	for _, message := range srv.Message {
		buf.WriteString(getMsgStr(message))
	}

	for _, enum := range srv.Enums {
		buf.WriteString(getEnumStr(enum))
	}

	os.WriteFile(fmt.Sprintf("%s.ts", srv.Name), buf.Bytes(), 777)
}

func getEnumStr(msg *Enum) string {
	var buf bytes.Buffer
	if msg.LeadingComments != "" {
		buf.WriteString(fmt.Sprintf("// %s\n", msg.LeadingComments))
	}
	buf.WriteString(fmt.Sprintf("export enum %s {\n", msg.Name))

	for _, enum := range msg.EnumItems {
		buf.WriteString(fmt.Sprintf("%s = %d,", enum.Key, enum.Value))
		if enum.LeadingComments != "" {
			buf.WriteString(fmt.Sprintf("  // %s", msg.LeadingComments))
		}
		buf.WriteString("\n")
	}
	buf.WriteString("}\n")
	return buf.String()
}

func getMsgStr(msg *Message) string {
	var buf bytes.Buffer
	if msg.LeadingComments != "" {
		buf.WriteString(fmt.Sprintf("// %s\n", msg.LeadingComments))
	}
	buf.WriteString(fmt.Sprintf("export interface %s {\n", msg.Name))

	for _, field := range msg.Fields {
		switch {
		case field.IsMap:
			buf.WriteString(fmt.Sprintf("%s:{\n[prop:%s]:%s;\n}", field.Name, TypeConversion(field.MapKey), field.MapValue))
			if field.LeadingComments != "" {
				buf.WriteString(fmt.Sprintf("// %s", msg.LeadingComments))
			}
			buf.WriteString("\n")
		default:
			typeStr := TypeConversion(field.Type)
			if typeStr == "" {
				typeStr = field.TypeName
			}

			buf.WriteString(fmt.Sprintf("%s:%s", field.Name, typeStr))
			if field.IsRepeated {
				buf.WriteString("[]")
			}
			buf.WriteString(";")
			if field.LeadingComments != "" {
				buf.WriteString(fmt.Sprintf("  // %s", msg.LeadingComments))
			}
			buf.WriteString("\n")
		}
	}
	buf.WriteString("}\n")
	return buf.String()
}

func TypeConversion(string2 string) string {
	switch string2 {
	case "TYPE_DOUBLE", "TYPE_FLOAT", "TYPE_INT64", "TYPE_UINT64", "TYPE_INT32",
		"TYPE_FIXED64", "TYPE_FIXED32", "TYPE_UINT32", "TYPE_SFIXED32", "TYPE_SFIXED64",
		"TYPE_SINT32", "TYPE_SINT64":
		return "number"
	case "TYPE_STRING":
		return "string"
	case "TYPE_BOOL":
		return "boolean"
	default:
	}
	return ""
}
