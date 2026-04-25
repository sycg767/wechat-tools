Component({
  properties: {
    url: {
      type: String,
      value: ''
    },
    fileName: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleDownload() {
      this.triggerEvent('download')
    }
  }
})
