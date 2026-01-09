package main

import (
	"encoding/json"
	"fmt"
	"github.com/adminck/pb2ts/internal/parser"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var (
	version = "dev"
	commit  = "unknown"
	date    = "unknown"
)

func main() {
	var protoPath string
	var importPaths string
	var showVersion bool

	rootCmd := &cobra.Command{
		Use:   "pb2ts-parser [flags] [proto_file]",
		Short: "Protocol Buffers to TypeScript code generator parser",
		Long:  `A tool to parse Protocol Buffer files and extract service definitions for TypeScript code generation.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if showVersion {
				fmt.Printf("pb2ts-parser version %s (commit: %s, built: %s)\n", version, commit, date)
				return nil
			}

			if protoPath == "" && len(args) > 0 {
				protoPath = args[0]
			}

			return runParser(protoPath, importPaths)
		},
	}

	rootCmd.Flags().StringVar(&protoPath, "proto", "", "Proto 文件目录路径")
	rootCmd.Flags().StringVar(&importPaths, "imports", "", "导入路径，多个路径用逗号分隔")
	rootCmd.Flags().BoolVar(&showVersion, "version", false, "显示版本信息")

	// 添加帮助信息
	rootCmd.SetUsageTemplate(rootCmd.UsageTemplate() + `
示例:
  pb2ts-parser --proto ./proto
  pb2ts-parser --proto ./proto --imports ./third_party,./other
  pb2ts-parser ./my_proto_file.proto
	`)

	if err := rootCmd.Execute(); err != nil {
		// 统一的错误输出到标准错误流
		log.Fatalf("错误: %v\n", err)
	}
}

// processImportPaths 处理导入路径参数
func processImportPaths(importPaths string) []string {
	rawImports := strings.Split(importPaths, ",")
	imports := make([]string, 0, len(rawImports))
	for _, imp := range rawImports {
		trimmed := strings.TrimSpace(imp)
		if trimmed != "" {
			imports = append(imports, trimmed)
		}
	}

	// 获取当前程序文件路径
	programPath, err := os.Executable()
	if err != nil {
		log.Fatalf("无法获取程序文件路径: %v", err)
	}

	programDir := filepath.Dir(programPath)

	// 默认导入路径
	return append(imports, fmt.Sprintf("%s/third_party", programDir))
}

func runParser(protoPath string, importPaths string) error {
	if protoPath == "" {
		return fmt.Errorf("必须指定 proto 文件路径")
	}

	// 处理导入路径
	imports := processImportPaths(importPaths)

	// 创建解析器
	p, err := parser.NewParser(imports)
	if err != nil {
		return fmt.Errorf("创建解析器失败: %w", err)
	}

	// 解析服务
	services, err := p.ParseServices(protoPath)
	if err != nil {
		return fmt.Errorf("解析失败: %w", err)
	}

	// 输出 JSON
	encoder := json.NewEncoder(os.Stdout)
	if err := encoder.Encode(services); err != nil {
		return fmt.Errorf("JSON 编码失败: %w", err)
	}

	return nil
}
