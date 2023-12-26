# 针对[wechatbot-webhook](https://github.com/danni-cool/wechatbot-webhook)的二次修改以满足个人的需求

修改的版本为[2.4.0]官方文档使用：https://github.com/danni-cool/wechatbot-webhook

构建Docker镜像

```
docker build -t wxbot .
```

运行：

```html
docker run -d \
--name wxBotWebhook \
-p wxbot \
你的构建路径
```

修改：

name值的单独定义

指定多个接收者，您可以将 `to` 参数设置为一个包含多个接收者名称的数组。例如：

```javascript
to = ['user1', 'user2', 'user3'];
```
