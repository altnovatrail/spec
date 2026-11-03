module github.com/altnovatrail/spec/contracts

go 1.27.0

tool (
	connectrpc.com/connect/v2/cmd/protoc-gen-connect-go
	google.golang.org/protobuf/cmd/protoc-gen-go
)

require google.golang.org/protobuf v1.36.12

require connectrpc.com/connect/v2 v2.0.2 // indirect
