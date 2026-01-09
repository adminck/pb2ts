package parser

import "testing"

func TestParser(t *testing.T) {

	parser, err := NewParser([]string{
		"../../../bin/third_party",
	})
	if err != nil {
		t.Fatalf("NewParser() error = %v", err)
	}

	services, err := parser.ParseServices("../../test_proto")
	if err != nil {
		t.Fatalf("ParseServices() error = %v", err)
	}

	for _, service := range services {
		t.Logf("Service: %s", service.Name)
		for _, rpc := range service.RPC {
			t.Logf("  RPC: %s", rpc.Name)
			t.Logf("    Method: %s", rpc.Method)
			t.Logf("    Path: %s", rpc.Path)
			t.Logf("    Request: %s", rpc.Request)
			t.Logf("    Resp: %s", rpc.Resp)
		}
	}

}
