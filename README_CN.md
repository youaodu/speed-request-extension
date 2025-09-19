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
- ✨ **语言支持与自动补全**: 全面的智能感知支持和智能补全功能
- 🎯 **代码片段**: 预构建模板，快速开发API

### 作为文档管理工具的优势

- **活跃文档**: API 文档不再是静态的，每个请求都可以实时执行和验证
- **版本控制**: `.api` 文件可以与代码一起进行版本控制，确保文档与代码同步
- **团队协作**: 团队成员可以共享和维护统一的 API 文档
- **测试集成**: 文档即测试用例，确保 API 的正确性

## 语言支持与自动补全

Speed Request 为 `.api` 文件提供全面的语言支持，配备智能自动补全功能，大幅提升您的开发效率。

### 🎯 自动补全功能

#### HTTP 方法补全
输入任意字母即可获得 HTTP 方法建议：
- **GET** - 从指定资源检索数据
- **POST** - 提交要处理的数据
- **PUT** - 更新资源或创建（如果不存在）
- **DELETE** - 删除指定资源
- **PATCH** - 对资源应用部分修改
- **HEAD** - 与 GET 相同但仅返回头部
- **OPTIONS** - 返回支持的 HTTP 方法

#### 区域标识符补全
API 文件区域的智能补全：
- **Global:** - 定义全局变量
- **Header:** - HTTP 头部区域
- **Params:** - 查询参数区域
- **Path:** - 路径变量区域
- **Body:** - 请求体内容
- **Form:** - 表单数据区域

#### HTTP 头部补全
常用 HTTP 头部及其说明：
- **Authorization** - 身份验证凭据
- **Content-Type** - 请求体的媒体类型
- **Accept** - 客户端可处理的内容类型
- **User-Agent** - 客户端软件标识
- **Cache-Control** - 缓存指令
- **Cookie** - 存储的 HTTP cookies
- **X-API-Key** - 自定义 API 身份验证头

#### Content-Type 值补全
常用 MIME 类型的自动建议：
- `application/json`
- `application/xml`
- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/plain`
- `text/html`

#### 变量补全
- **全局变量**: 显示所有已定义的全局变量
- **模板语法**: 自动补全 `{{变量名}}` 格式
- **上下文感知**: 根据当前上下文仅显示相关变量

#### API 请求模板
输入 `###` 获得完整的 API 请求模板，包含占位符：
```
### API 名称
METHOD https://api.example.com
Header:
  Authorization: Bearer token
```

### 🚀 使用技巧

#### 触发自动补全 (Mac)
- **`Cmd+I`** - 主要自动补全快捷键
- **`Option+Esc`** - 备用补全触发器
- **自动触发** - 输入相关字符时自动显示补全

#### 智能上下文识别
- 扩展能够理解您当前的上下文并提供相关建议
- 在 Header: 区域时，会显示头部名称补全
- 在 `Content-Type:` 后输入时，会获得 MIME 类型建议
- 输入 `{{` 时会出现变量补全

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