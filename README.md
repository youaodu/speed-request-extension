# Speed Request - VSCode HTTP Request Extension

> 📖 English Documentation | [中文文档](README_CN.md)

## Project Overview

Speed Request is a VSCode extension designed for developers to quickly create and execute HTTP requests directly within the editor. This extension serves not only as a powerful API testing tool but, more importantly, **it functions as an API documentation management system**, allowing you to easily maintain, organize, and execute HTTP requests during development.

### Core Features

- 🚀 **Quick Request Execution**: Send HTTP requests directly in the editor without switching to other tools
- 📚 **Documentation Management**: Use `.api` files as living API documentation where requests serve as documentation
- 🔧 **Syntax Highlighting**: Custom syntax highlighting support designed specifically for `.api` files
- 🌐 **Variable Support**: Support for global variables and template variables for easy environment switching
- 📝 **Response Recording**: Automatically record request responses for debugging and documentation maintenance

### Advantages as a Documentation Management Tool

- **Living Documentation**: API documentation is no longer static; every request can be executed and validated in real-time
- **Version Control**: `.api` files can be version-controlled alongside code, ensuring documentation stays in sync
- **Team Collaboration**: Team members can share and maintain unified API documentation
- **Test Integration**: Documentation serves as test cases, ensuring API correctness

## Syntax Reference

### Basic Syntax Structure

#### 1. Global Variable Definition
```
Global:
  variableName=variableValue
  token=your_api_token
  domain=https://api.example.com
```

#### 2. HTTP Request Format
```
### Request Description (Comment)
METHOD URL
Header:
  HeaderName: HeaderValue
  Authorization: Bearer {{token}}
Params:
  paramName=paramValue&paramName2=paramValue2
Path:
  pathVariableName=value
Body:
{
  "json": "data"
}
Form:
{
  "form": "data"
}
```

### Detailed Syntax Examples

#### Global Variables
```
Global:
  token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
  baseUrl=https://api.example.com
  userId=12345
```

#### GET Request
```
### Get User Information
GET {{baseUrl}}/users/{{userId}}
Header:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Params:
  page=1&limit=10
```

#### POST Request (JSON Data)
```
### Create New User
POST {{baseUrl}}/users
Header:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "age": 25
}
```

#### POST Request (Form Data)
```
### Upload User Avatar
POST {{baseUrl}}/users/{{userId}}/avatar
Header:
  Authorization: Bearer {{token}}
Form:
{
  "file": "@/path/to/avatar.jpg",
  "description": "User avatar"
}
```

#### PUT Request
```
### Update User Information
PUT {{baseUrl}}/users/{{userId}}
Header:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com"
}
```

#### DELETE Request
```
### Delete User
DELETE {{baseUrl}}/users/{{userId}}
Header:
  Authorization: Bearer {{token}}
```

### Variable System

#### Global Variables
Variables defined at the top of the file that can be used throughout the entire file:
```
Global:
  env=development
  apiKey=your_api_key_here
```

#### Template Variables
Use `{{variableName}}` syntax to reference variables:
```
GET {{baseUrl}}/api/{{version}}/users
```

#### Path Parameters
Use the `Path:` section to define dynamic parameters in the URL path:
```
GET https://api.example.com/users/{{userId}}/posts/{{postId}}
Path:
  userId=123
  postId=456
```

### Response Handling

After request execution, the response is automatically added to the file:
```
#### Response
HTTP/1.1 200 OK
Content-Type: application/json
Date: 2025-01-15T10:30:00.000Z
Duration: 245ms

{
  "id": 123,
  "name": "John Doe",
  "email": "john.doe@example.com"
}
####
```

## Usage

1. **Create .api file**: Create a file with `.api` extension in your project
2. **Write requests**: Write HTTP requests following the syntax above
3. **Execute requests**:
   - Right-click and select "Send API Request"
   - Or use Command Palette and search for "Send API Request"
   - Or use keyboard shortcuts to execute requests
4. **View responses**: Responses will be automatically added to the Response section in the file

## Best Practices

### Documentation Organization
- Create different `.api` files for different functional modules
- Use clear comments to describe the purpose of each request
- Use global variables wisely to manage environment configurations

### Version Control
- Include `.api` files in your version control system
- Regularly update and maintain request documentation
- Use branches to manage configurations for different environments

### Team Collaboration
- Establish unified naming conventions
- Share global variable configurations
- Regularly sync and update API documentation

## Installation and Setup

1. Search for "Speed Request" in the VSCode Extension Marketplace
2. Click Install
3. Restart VSCode
4. Create `.api` files and start using

## Contributing

We welcome Issues and Pull Requests to help improve this project.

## License

MIT License