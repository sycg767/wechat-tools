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
    buildImageFile(res) {
      const tempFile = res.tempFiles && res.tempFiles.length ? res.tempFiles[0] : null
      const path = tempFile?.path || (res.tempFilePaths && res.tempFilePaths[0]) || ''
      if (!path) {
        return null
      }
      const name = path.split('/').pop() || `image_${Date.now()}.jpg`
      const size = tempFile?.size || 0
      const type = tempFile?.type || 'image'
      return { path, name, size, type }
    },

    chooseImage() {
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
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
