const Service = require('../service')
const Middleware = require('../middleware')
const Utils = require('../utils/index')

module.exports = function registerPushHook({ app, bot }) {
  // 定义发送者的name值函数
  const getSenderName = (to) => {
    // 支持jsonLike传递备注名 {alias: 123}
    if (/{\s*"?'?alias"?'?\s*:[^}]+}/.test(to)) {
      try {
        const parsedTo = Utils.parseJsonLikeStr(to)
        return parsedTo.alias
      } catch (e) {
        throw new Error(`to 参数发消息给备注名， json string 格式不正确`)
      }
    } else {
      return to
    }
  }

  // 处理 POST 请求
  app.post(
    '/webhook/msg',
    Middleware.dynamicStorageMiddleware,
    Service.handleError(async (req, res) => {
      let to, isRoom, content, type
      let unValidParamsStr = ''

      // 表单传文件(暂时只用来传文件)
      if (req.is('multipart/form-data')) {
        to = req.body.to
        isRoom = req.body.isRoom || '0'
        content = req.files.find((item) => item.fieldname === 'content') || {}
        // 转化上传文件名中文字符但是被编码成 iso885910 的问题
        content.originalname &&
          (content.originalname = Utils.tryConvertCnCharToUtf8Char(
            content.originalname,
          ))
        type = 'file'

        // 校验必填参数
        unValidParamsStr = Utils.getUnValidParamsList([
          {
            key: 'to',
            val: to,
            required: true,
            type: 'string',
            unValidReason: '',
          },
          {
            key: 'isRoom',
            val: isRoom,
            required: false,
            enum: ['1', '0'],
            type: 'string',
            unValidReason: '',
          },
          {
            key: 'content',
            val: content.size || 0,
            required: true,
            type: 'file',
            unValidReason: '',
          },
        ]).map(({ unValidReason }) => unValidReason)

        isRoom = !!+isRoom /** "1" => true , "0" => false */

        // 支持jsonLike传递备注名 {alias: 123}
        if (/{\s*"?'?alias"?'?\s*:[^}]+}/.test(to)) {
          try {
            to = Utils.parseJsonLikeStr(to)
          } catch (e) {
            unValidParamsStr = [
              `to 参数发消息给备注名， json string 格式不正确`,
            ].concat(unValidParamsStr)
          }
        }
        unValidParamsStr = unValidParamsStr.join('，')

        // json
      } else {
        to = req.body.to
        isRoom = req.body.isRoom || false
        type = req.body.type
        content = req.body.content

        // 校验必填参数
        unValidParamsStr = Utils.getUnValidParamsList([
          {
            key: 'to',
            val: to,
            required: true,
            type: ['string', 'object'],
            unValidReason: '',
          },
          {
            key: 'type',
            val: type,
            required: true,
            type: 'string',
            enum: ['text', 'fileUrl'],
            unValidReason: '',
          },
          {
            key: 'content',
            val: content,
            required: true,
            type: 'string',
            unValidReason: '',
          },
          {
            key: 'isRoom',
            val: isRoom,
            required: false,
            type: 'boolean',
            unValidReason: '',
          },
        ])
          .map(({ unValidReason }) => unValidReason)
          .join('，')
      }

      if (unValidParamsStr) {
        return res.status(200).json({
          success: false,
          message: `[${unValidParamsStr}] params  is not valid, please checkout the api reference (https://github.com/danni-cool/docker-wechatbot-webhook#%EF%B8%8F-api)`,
        })
      }

      const senderName = getSenderName(to)

      const receiverNames = Array.isArray(to) ? to : [to]
      const msgReceivers = isRoom
        ? await Promise.all(receiverNames.map((name) => bot.Room.find({ topic: name })))
        : await Promise.all(receiverNames.map((name) => bot.Contact.find(Utils.equalTrueType(name, 'object') ? name : { name })))

      const sendStatuses = await Promise.all(msgReceivers.map((msgReceiver) => {
        if (msgReceiver) {
          return Service.formatAndSendMsg({
            bot,
            type,
            content,
            msgInstance: msgReceiver,
            res,
          })
        } else {
          return false
        }
      }))

      const success = sendStatuses.every((status) => status)
      if (success) {
        res.status(200).json({
          success: true,
          message: `Message sent successfully.`,
        })
      } else {
        res.status(200).json({
          success: false,
          message: `${isRoom ? 'Room' : 'User'} is not found`,
        })
      }
    }),
  )
}
