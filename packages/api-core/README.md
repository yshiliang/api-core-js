# api-core-js

基于koa实现api-core-js，可以非常便捷的实现JSON-RPC风格及Restful风格的Api定义
1、通过注解定义Servlet
2、通过注解定义Controller（service)
3、通过配置项创建Application

基本设计：

Servlet
GlobalDispatchServlet
ServletMapping
Service/IServiceDescriptor
ServiceMapping
ApiDescriptor
IParameterDescriptor