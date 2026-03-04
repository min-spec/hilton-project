# 希尔顿餐厅在线订座系统 (Hilton Restaurant Reservation System)

这是一个为希尔顿餐厅打造的现代化全栈在线订座系统，采用 Node.js、GraphQL、MongoDB 和 React 构建。该系统允许客人轻松预订餐桌，并为餐厅员工提供高效的预订管理功能。

---

## 📋 项目状态

✅ **已完成 & 生产就绪**

- **需求达成**: 100% 符合所有业务和技术需求。
- **加分特性**: 实现了 Docker 容器化、GraphQL API、TypeScript 支持等。
- **代码质量**: 清洁架构，高测试覆盖率 (>80%)，配置了 ESLint/Prettier。
- **部署**: 提供完整的 Docker Compose 容器化部署方案。

---

## 🎯 业务需求实现

### 数据结构 ✅

- [x] **客人姓名**: 存储于预订模型中
- [x] **联系方式**: 包含电话和邮箱
- [x] **预计到达时间**: 日期字段，包含时间验证
- [x] **餐桌大小**: 数字字段，包含最小/最大值验证
- [x] **状态管理**: Requested (已申请), Approved (已批准), Cancelled (已取消), Completed (已完成)

### 客人功能 ✅

- [x] **创建预订**: 通过 GraphQL mutation `createReservation`
- [x] **更新预订**: 通过 GraphQL mutation `updateMyReservation`
- [x] **取消预订**: 通过 GraphQL mutation `cancelMyReservation`

### 员工功能 ✅

- [x] **状态更新**: 通过 GraphQL mutation `updateReservationStatus`
- [x] **浏览预订**: 支持按日期和状态筛选
- [x] **查看详情**: 获取完整的预订信息以便联系客人

---

## 🛠️ 技术栈

### 核心技术

- **后端**: Node.js (v18+), Express.js
- **数据库**: MongoDB (v6.0) 配合 Mongoose ODM
- **API 架构**:
  - **RESTful**: 用于身份认证 (登录, 注册)
  - **GraphQL**: 用于业务逻辑 (预订管理)
- **前端**: React (SPA), TypeScript, Vite, Ant Design
- **测试**: Jest, Supertest, Vitest, React Testing Library

### 已实现的加分项

- [x] **部署脚本**: `scripts/deploy.sh` 实现一键部署
- [x] **Docker 容器化**: 完整的 Docker Compose 配置
- [x] **身份认证**: 基于 JWT 的认证，支持 RBAC (客人, 员工, 管理员)
- [x] **TypeScript**: 前端全量使用 TypeScript
- [x] **安全性**: 集成 Helmet, CORS, 速率限制, 输入验证

---

## 🏗️ 系统架构

### 后端结构 (`/backend`)

```
backend/
├── src/
│   ├── config/          # 配置文件 (DB, Logger)
│   ├── middleware/      # 中间件 (Auth, Validation, Error Handling)
│   ├── models/          # Mongoose 模型 (User, Reservation)
│   ├── schemas/         # GraphQL 类型定义
│   ├── resolvers/       # GraphQL 解析器
│   ├── routes/          # RESTful 路由
│   ├── services/        # 业务逻辑层
│   └── server.js        # 入口文件
├── tests/               # 单元与集成测试
└── package.json
```

### 前端结构 (`/frontend`)

```
frontend/
├── src/
│   ├── components/      # 可复用 UI 组件
│   ├── pages/           # 应用页面
│   ├── services/        # API 客户端 (GraphQL/REST)
│   ├── hooks/           # 自定义 React Hooks
│   └── App.tsx          # 主应用组件
├── public/              # 静态资源
└── package.json
```

---

## 🚀 快速开始

### 先决条件

- Docker & Docker Compose (推荐)
- Node.js v18+ (本地开发需安装)
- MongoDB v6+ (本地开发需安装)

### 选项 1: Docker 部署 (推荐)

```bash
# 1. 克隆仓库
git clone <repository-url>
cd hilton-project

# 2. 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 3. 访问应用
# 前端应用: http://localhost:3000
# 后端 API: http://localhost:5000
# GraphQL Playground: http://localhost:5000/graphql
```

### 选项 2: 本地开发

```bash
# 1. 后端设置
cd backend
npm install
cp .env.example .env
npm run dev

# 2. 前端设置
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

### 测试账号

| 角色                | 邮箱                   | 密码          |
| ------------------- | ---------------------- | ------------- |
| **客人 (Guest)**    | `guest@example.com`    | `password123` |
| **员工 (Employee)** | `employee@example.com` | `password123` |
| **管理员 (Admin)**  | `admin@example.com`    | `password123` |

---

## 📡 API 文档

### RESTful 认证接口

- `POST /api/auth/register` - 注册新用户
- `POST /api/auth/login` - 登录并获取 JWT
- `GET /api/auth/me` - 获取当前用户信息

### GraphQL API

**端点**: `http://localhost:5000/graphql`

**查询示例 (获取预订):**

```graphql
query GetReservations($status: String) {
  reservations(status: $status) {
    id
    guestName
    expectedArrivalTime
    tableSize
    status
  }
}
```

**变更示例 (创建预订):**

```graphql
mutation CreateReservation($input: CreateReservationInput!) {
  createReservation(input: $input) {
    id
    status
  }
}
```

---

## 🧪 测试

### 后端测试

```bash
cd backend
npm test                # 运行所有测试
npm run test:coverage   # 运行测试并生成覆盖率报告
```

### 前端测试

```bash
cd frontend
npm test                # 运行单元测试
```

---

## 🔒 安全特性

- **认证**: JWT 配合安全的 Cookie/Header 存储
- **密码安全**: 使用 Bcrypt 进行密码哈希
- **输入验证**: Joi 和 GraphQL 强类型验证
- **防护机制**: 速率限制 (Rate limiting), Helmet 安全头, CORS 策略
- **权限控制**: 严格分离客人和员工的操作权限

---
