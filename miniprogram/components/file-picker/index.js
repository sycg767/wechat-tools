Component({
  properties: {
    file: {
      type: Object,
      value: null
    },
    accept: {
      type: String,
      value: 'file'
    },
    title: {
      type: String,
      value: '点击选择文件'
    },
    description: {
      type: String,
      value: '支持 PDF、Word、图片等格式'
    }
  },

  data: {
    fileSizeText: ''
  },

  observers: {
    file(file) {
      if (!file || !file.size) {
        this.setData({ fileSizeText: '' })
        return
      }
      this.setData({ fileSizeText: `${(file.size / 1024).toFixed(2)} KB` })
    }
  },

  methods: {
    formatTimestamp() {
      const date = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    },

    resolveImageExtension(tempFile, path) {
      const pathExt = (path.split('.').pop() || '').toLowerCase()
      if (['jpg', 'jpeg', 'png', 'webp'].includes(pathExt)) {
        return pathExt
      }

      const mimeType = (tempFile?.type || '').toLowerCase()
      if (mimeType.includes('png')) {
        return 'png'
      }
      if (mimeType.includes('webp')) {
        return 'webp'
      }
      return 'jpg'
    },

    buildImageFile(res) {
      const tempFile = res.tempFiles && res.tempFiles.length ? res.tempFiles[0] : null
      const path = tempFile?.path || (res.tempFilePaths && res.tempFilePaths[0]) || ''
      if (!path) {
        return null
      }

      const rawName = path.split('/').pop() || ''
      const extension = this.resolveImageExtension(tempFile, path)
      const name = rawName && !rawName.toLowerCase().endsWith('.bin') && rawName.includes('.')
        ? rawName
        : `image_${this.formatTimestamp()}.${extension}`
      const size = tempFile?.size || 0
      const type = tempFile?.type || `image/${extension}`
      return { path, name, size, type }
    },

    chooseImage() {
      wx.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const file = this.buildImageFile(res)
          if (!file) {
            return
          }
          this.triggerEvent('selected', { file })
        }
      })
    },

    chooseGeneralFile() {
      const type = this.properties.accept === 'pdf' ? 'file' : 'all'
      wx.chooseMessageFile({
        count: 1,
        type,
        success: (res) => {
          const file = res.tempFiles[0]
          this.triggerEvent('selected', { file })
        }
      })
    },

    chooseFile() {
      if (this.properties.accept === 'image') {
        this.chooseImage()
        return
      }
      this.chooseGeneralFile()
    }
  }
})
