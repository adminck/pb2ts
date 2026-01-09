package types

// Message 表示一个 Protocol Buffer 消息类型
type Message struct {
	Name            string   `json:"name"`
	LeadingComments string   `json:"leadingComments"`
	Fields          []*Field `json:"fields"`
}

// Field 表示消息中的一个字段
type Field struct {
	Name            string `json:"name"`
	Type            string `json:"type"`
	TypeName        string `json:"typeName"`
	LeadingComments string `json:"leadingComments"`
	IsMap           bool   `json:"isMap"`
	IsRepeated      bool   `json:"isRepeated"`
	MapKey          string `json:"mapKey"`
	MapValue        string `json:"mapValue"`
}

// Service 表示一个 gRPC 服务
type Service struct {
	Name            string         `json:"name"`
	LeadingComments string         `json:"leadingComments"`
	Message         []*Message     `json:"message"`
	RPC             []*RPC         `json:"rpc"`
	Enums           []*Enum        `json:"enums"`
	msgMap          map[string]int `json:"-"`
}

// NewService 创建一个新的 Service
func NewService() *Service {
	return &Service{
		RPC:     make([]*RPC, 0),
		Message: make([]*Message, 0),
		Enums:   make([]*Enum, 0),
		msgMap:  make(map[string]int),
	}
}

// SetMsgMap 设置消息映射
func (s *Service) SetMsgMap(msgName string, index int) {
	s.msgMap[msgName] = index
}

// IsMsgMap 检查消息是否已存在
func (s *Service) IsMsgMap(msgName string) bool {
	_, exists := s.msgMap[msgName]
	return exists
}

// Enum 表示一个枚举类型
type Enum struct {
	Name            string      `json:"name"`
	LeadingComments string      `json:"leadingComments"`
	EnumItems       []*EnumItem `json:"enumItems"`
}

// EnumItem 表示枚举中的一个项
type EnumItem struct {
	Key             string `json:"key"`
	Value           int32  `json:"value"`
	LeadingComments string `json:"leadingComments"`
}

// RPC 表示一个 RPC 方法
type RPC struct {
	Name            string `json:"name"`
	LeadingComments string `json:"leadingComments"`
	Method          string `json:"method"`
	Path            string `json:"path"`
	Request         string `json:"request"`
	Resp            string `json:"resp"`
}
