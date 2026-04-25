Component({
  properties: {
    file: {
      type: Object,
      value: null
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
    chooseFile() {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
          const file = res.tempFiles[0]
          this.triggerEvent('selected', { file })
        }
      })
    }
  }
})
