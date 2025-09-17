# Speed Request - VSCode HTTP 请求扩展

> 📖 [English Documentation](README.md) | 中文文档

## 项目介绍

Speed Request 是一个专为开发者设计的 VSCode 扩展，旨在为编辑器中快速建立和执行 HTTP 请求提供最佳体验。该扩展不仅是一个强大的 API 测试工具，更重要的是**它可以作为 API 文档管理系统使用**，让您在开发过程中轻松维护、组织和执行 HTTP 请求。

### 核心特性

- 🚀 **快速请求执行**: 在编辑器中直接发送 HTTP 请求，无需切换到其他工具
- 📚 **文档化管理**: 使用 `.api` 文件作为活跃的 API 文档，请求即文档
- 🔧 **语法高亮**: 专为 `.api` 文件设计的语法高亮支持
- 🌐 **变量支持**: 支持全局变量和模板变量，便于环境切换
- 📝 **响应记录**: 自动记录请求响应，便于调试和文档维护

### 作为文档管理工具的优势

- **活跃文档**: API 文档不再是静态的，每个请求都可以实时执行和验证
- **版本控制**: `.api` 文件可以与代码一起进行版本控制，确保文档与代码同步
- **团队协作**: 团队成员可以共享和维护统一的 API 文档
- **测试集成**: 文档即测试用例，确保 API 的正确性

## 语法说明

### 基本语法结构

#### 1. 全局变量定义
```
Global:
  变量名=变量值
  token=your_api_token
  domain=https://api.example.com
```

#### 2. HTTP 请求格式
```
### 请求描述（注释）
方法 URL
Header:
  头部名称: 头部值
  Authorization: Bearer {{token}}
Params:
  参数名=参数值&参数名2=参数值2
Path:
  路径变量名=值
Body:
{
  "json": "数据"
}
Form:
{
  "form": "数据"
}
```

### 详细语法示例

#### 全局变量
```
Global:
  token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
  baseUrl=https://api.example.com
  userId=12345
```

#### GET 请求
```
### 获取用户信息
GET {{baseUrl}}/users/{{userId}}
Header:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Params:
  page=1&limit=10
```

#### POST 请求（JSON 数据）
```
### 创建新用户
POST {{baseUrl}}/users
Header:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "age": 25
}
```

#### POST 请求（表单数据）
```
### 上传用户头像
POST {{baseUrl}}/users/{{userId}}/avatar
Header:
  Authorization: Bearer {{token}}
Form:
{
  "file": "@/path/to/avatar.jpg",
  "description": "用户头像"
}
```

#### PUT 请求
```
### 更新用户信息
PUT {{baseUrl}}/users/{{userId}}
Header:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "name": "李四",
  "email": "lisi@example.com"
}
```

#### DELETE 请求
```
### 删除用户
DELETE {{baseUrl}}/users/{{userId}}
Header:
  Authorization: Bearer {{token}}
```

### 变量系统

#### 全局变量
在文件顶部定义的变量，可在整个文件中使用：
```
Global:
  env=development
  apiKey=your_api_key_here
```

#### 模板变量
使用 `{{变量名}}` 语法引用变量：
```
GET {{baseUrl}}/api/{{version}}/users
```

#### 路径参数
使用 `Path:` 部分定义 URL 路径中的动态参数：
```
GET https://api.example.com/users/{{userId}}/posts/{{postId}}
Path:
  userId=123
  postId=456
```

### 响应处理

请求执行后，响应会自动添加到文件中：
```
#### Response
HTTP/1.1 200 OK
Content-Type: application/json
Date: 2025-01-15T10:30:00.000Z
Duration: 245ms

{
  "id": 123,
  "name": "张三",
  "email": "zhangsan@example.com"
}
####
```

## 使用方法

1. **创建 .api 文件**: 在项目中创建以 `.api` 为扩展名的文件
2. **编写请求**: 按照上述语法编写 HTTP 请求
3. **执行请求**:
   - 右键选择 "Send API Request"
   - 或使用命令面板搜索 "Send API Request"
   - 或使用快捷键执行请求
4. **查看响应**: 响应会自动添加到文件中的 Response 部分

## 最佳实践

### 文档组织
- 按功能模块创建不同的 `.api` 文件
- 使用清晰的注释描述每个请求的用途
- 合理使用全局变量管理环境配置

### 版本控制
- 将 `.api` 文件纳入版本控制系统
- 定期更新和维护请求文档
- 使用分支管理不同环境的配置

### 团队协作
- 制定统一的命名规范
- 共享全局变量配置
- 定期同步和更新 API 文档

## 安装和配置

1. 在 VSCode 扩展市场搜索 "Speed Request"
2. 点击安装
3. 重启 VSCode
4. 创建 `.api` 文件开始使用

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。

## 许可证

MIT License