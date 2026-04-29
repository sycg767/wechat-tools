const request = require('../../utils/request');
const upload = require('../../utils/upload');
const taskStore = require('../../utils/task-store');

Page({
  data: {
    fileSelected: false,
    tempFilePath: '',
    originalFileName: '',

    previewLoading: false,
    previewPages: [],
    totalPages: 0,
    previewCount: 0,
    truncated: false,

    processing: false,
    progress: 0,
    statusText: '',
    resultUrl: '',
    resultFileName: ''
  },

  onFileSelect(e) {
    const { file } = e.detail;
    if (!file) return;

    const path = file.path || file.tempFilePath;
    const name = file.name || '';
    if (!name.toLowerCase().endsWith('.pdf')) {
      wx.showToast({ title: '只支持 PDF 文件', icon: 'none' });
      return;
    }

    this.setData({
      fileSelected: true,
      tempFilePath: path,
      originalFileName: name,
      resultUrl: '',
      previewPages: [],
      totalPages: 0,
      previewCount: 0,
      truncated: false
    });

    this.loadPreview();
  },

  async loadPreview() {
    if (!this.data.tempFilePath) return;

    this.setData({ previewLoading: true });
    wx.showLoading({ title: '生成预览中' });

    try {
      const res = await upload('/tool/pdf-page-manage-preview', this.data.tempFilePath, {
        originalFileName: this.data.originalFileName
      });

      const pages = (res.data?.pages || []).map((item) => ({
        pageNo: Number(item.pageNo),
        thumbnailBase64: item.thumbnailBase64,
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        rotation: Number(item.rotation || 0),
        deleted: false
      }));

      this.setData({
        previewLoading: false,
        previewPages: pages,
        totalPages: Number(res.data?.totalPages || pages.length),
        previewCount: Number(res.data?.previewCount || pages.length),
        truncated: !!res.data?.truncated
      });
    } catch (err) {
      this.setData({ previewLoading: false });
      wx.showToast({ title: err.message || '预览失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  rotatePage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const pages = [...this.data.previewPages];
    if (!pages[index]) return;
    pages[index].rotation = (Number(pages[index].rotation || 0) + 90) % 360;
    this.setData({ previewPages: pages });
  },

  toggleDelete(e) {
    const index = Number(e.currentTarget.dataset.index);
    const pages = [...this.data.previewPages];
    if (!pages[index]) return;
    pages[index].deleted = !pages[index].deleted;
    this.setData({ previewPages: pages });
  },

  moveUp(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index <= 0) return;
    const pages = [...this.data.previewPages];
    [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
    this.setData({ previewPages: pages });
  },

  moveDown(e) {
    const index = Number(e.currentTarget.dataset.index);
    const pages = [...this.data.previewPages];
    if (index < 0 || index >= pages.length - 1) return;
    [pages[index + 1], pages[index]] = [pages[index], pages[index + 1]];
    this.setData({ previewPages: pages });
  },

  buildPagesJson() {
    const pages = (this.data.previewPages || [])
      .filter((item) => !item.deleted)
      .map((item) => ({
        pageNo: Number(item.pageNo),
        rotation: Number(item.rotation || 0),
        deleted: false
      }));

    if (!pages.length) {
      throw new Error('至少保留一页');
    }

    return JSON.stringify(pages);
  },

  async startProcess() {
    if (!this.data.tempFilePath) return;

    let pagesJson = '';
    try {
      pagesJson = this.buildPagesJson();
    } catch (e) {
      wx.showToast({ title: e.message || '参数错误', icon: 'none' });
      return;
    }

    this.setData({
      processing: true,
      progress: 10,
      statusText: '正在提交任务...',
      resultUrl: ''
    });

    try {
      const res = await upload('/tool/pdf-page-manage', this.data.tempFilePath, {
        originalFileName: this.data.originalFileName,
        pagesJson
      });

      const taskId = res.data;
      taskStore.upsertTask({
        taskId,
        toolType: 'pdf-page-manage',
        sourceFileName: this.data.originalFileName,
        createdAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '',
        resultFileName: ''
      });

      this.pollTaskStatus(taskId);
    } catch (err) {
      wx.showToast({ title: err.message || '处理失败', icon: 'none' });
      this.setData({ processing: false });
    }
  },

  async pollTaskStatus(taskId) {
    try {
      const res = await request.request({
        url: `/file/status/${taskId}`,
        method: 'GET'
      });

      if (res.code === 200) {
        const { status, progress, resultUrl, resultFileName, message } = res.data;

        this.setData({
          progress: progress || 0,
          statusText: status === 'PROCESSING' ? '正在处理 PDF...' : '处理完成'
        });

        if (status === 'SUCCESS') {
          this.setData({
            processing: false,
            resultUrl,
            resultFileName
          });
          taskStore.upsertTask(res.data);
          wx.showToast({ title: '处理成功', icon: 'success' });
        } else if (status === 'FAIL') {
          throw new Error(message || '处理失败');
        } else {
          setTimeout(() => this.pollTaskStatus(taskId), 1500);
        }
      }
    } catch (err) {
      wx.showToast({ title: err.message || '查询状态失败', icon: 'none' });
      this.setData({ processing: false });
    }
  }
});
