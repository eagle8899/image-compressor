document.addEventListener('DOMContentLoaded', function() {
    // 获取所有需要的DOM元素
    const dropZone = document.getElementById('dropZone');            // 拖放区域
    const fileInput = document.getElementById('fileInput');          // 文件输入框
    const uploadBtn = document.getElementById('uploadBtn');          // 上传按钮
    const imageProcessing = document.getElementById('imageProcessing'); // 图片处理区域
    const originalImage = document.getElementById('originalImage');   // 原始图片显示
    const compressedImage = document.getElementById('compressedImage'); // 压缩后图片显示
    const originalSize = document.getElementById('originalSize');     // 原始文件大小显示
    const compressedSize = document.getElementById('compressedSize'); // 压缩后文件大小显示
    const qualitySlider = document.getElementById('quality');        // 质量滑块
    const qualityValue = document.getElementById('qualityValue');    // 质量值显示
    const compressBtn = document.getElementById('compressBtn');      // 压缩按钮
    const downloadBtn = document.getElementById('downloadBtn');      // 下载按钮

    // 存储当前处理的文件
    let currentFile = null;

    // 添加提示框
    const createToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    // 上传按钮点击事件
    uploadBtn.addEventListener('click', () => {
        fileInput.click();                                          // 触发文件选择框
    });

    // 文件选择事件处理
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];                            // 获取选择的文件
        if (file) {
            handleFile(file);                                      // 处理选择的文件
        }
    });

    // 拖放事件处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();                                         // 阻止默认行为
        dropZone.style.borderColor = '#0071e3';                    // 改变边框颜色
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();                                         // 阻止默认行为
        dropZone.style.borderColor = '#d2d2d7';                    // 恢复边框颜色
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();                                         // 阻止默认行为
        dropZone.style.borderColor = '#d2d2d7';                    // 恢复边框颜色
        const file = e.dataTransfer.files[0];                      // 获取拖放的文件
        if (file) {
            handleFile(file);                                      // 处理拖放的文件
        }
    });

    // 文件处理函数
    function handleFile(file) {
        // 检查是否是图片文件
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return;
        }

        currentFile = file;                                        // 保存当前文件
        
        // 显示原始图片和大小
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;                   // 显示原始图片
            originalSize.textContent = formatFileSize(file.size);  // 显示原始大小
            imageProcessing.style.display = 'block';               // 显示处理区域
            compressedImage.src = '';                             // 清空压缩图片
            compressedSize.textContent = '等待压缩';               // 重置压缩大小显示
            downloadBtn.disabled = true;                           // 禁用下载按钮
            
            // 重置质量滑块
            qualitySlider.value = 100;
            qualityValue.textContent = '100%';
        };
        reader.readAsDataURL(file);                               // 读取文件
    }

    // 设置质量滑块的初始值和显示
    qualitySlider.value = 100;                                      // 设置滑块初始值为100
    qualityValue.textContent = '100%';                              // 显示初始质量值

    // 监听质量滑块变化事件
    qualitySlider.addEventListener('input', function() {
        const value = parseInt(this.value);                         // 获取滑块值
        qualityValue.textContent = `${value}%`;                     // 更新显示的质量值
    });

    // 压缩按钮点击事件
    compressBtn.addEventListener('click', () => {
        if (!currentFile) {
            createToast('请先选择图片', 'error');
            return;
        }

        const userQuality = parseInt(qualitySlider.value);
        
        // 100%质量时直接使用原图
        if (userQuality === 100) {
            handleOriginalImage();
            return;
        }

        // 检查图片是否适合压缩
        if (currentFile.size < 50 * 1024) { // 小于50KB
            createToast('文件已经很小，无需压缩', 'warning');
            handleOriginalImage(); // 直接显示原图
            return;
        }

        // 预检查是否可能进行有效压缩
        checkCompressibility(currentFile, userQuality).then(canCompress => {
            if (!canCompress) {
                createToast('当前设置下无法有效压缩，建议调整参数', 'warning');
                handleOriginalImage(); // 直接显示原图
                return;
            }
            compressImage(currentFile, userQuality);
        });
    });

    // 添加压缩可行性检查函数
    function checkCompressibility(file, quality) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // 进行测试压缩
                    canvas.toBlob((testBlob) => {
                        if (!testBlob) {
                            resolve(false);
                            return;
                        }
                        // 如果测试压缩后的大小接近或大于原始大小，则认为无法有效压缩
                        const canCompress = testBlob.size < file.size * 0.95;
                        resolve(canCompress);
                    }, file.type, quality / 100);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // 处理原图显示的函数
    function handleOriginalImage() {
        const reader = new FileReader();
        reader.onload = (e) => {
            compressedImage.src = e.target.result;
            compressedSize.textContent = formatFileSize(currentFile.size);
            qualityValue.textContent = '100% (原图)';
            downloadBtn.disabled = false;
        };
        reader.readAsDataURL(currentFile);
    }

    // 修改后的压缩函数
    function compressImage(file, userQuality) {
        // 显示加载状态
        compressedImage.src = '';
        compressedSize.textContent = '压缩中...';
        downloadBtn.disabled = true;

        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 计算合适的压缩参数
            let targetQuality = userQuality / 100;
            let width = img.width;
            let height = img.height;

            // 根据图片大小调整压缩策略
            if (file.size > 1024 * 1024) { // 1MB以上
                const scale = Math.min(1, Math.sqrt(1024 * 1024 / file.size));
                width *= scale;
                height *= scale;
            }

            canvas.width = width;
            canvas.height = height;
            
            try {
                // 绘制图像
                ctx.drawImage(img, 0, 0, width, height);

                // 压缩图像
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            createToast('压缩失败，请重试', 'error');
                            return;
                        }

                        const originalSize = file.size;
                        const compressedSize = blob.size;
                        
                        // 检查压缩效果
                        if (compressedSize >= originalSize) {
                            // 尝试找到最佳压缩质量
                            if (targetQuality > 0.2) {
                                targetQuality *= 0.8;
                                canvas.toBlob(
                                    (newBlob) => handleCompressedResult(newBlob, originalSize, targetQuality),
                                    file.type,
                                    targetQuality
                                );
                                return;
                            } else {
                                createToast('无法进一步压缩，建议降低图片尺寸', 'warning');
                            }
                        }

                        handleCompressedResult(blob, originalSize, targetQuality);
                    },
                    file.type,
                    targetQuality
                );
            } catch (error) {
                console.error('压缩过程出错:', error);
                createToast('压缩过程出错，请重试', 'error');
            }
        };

        img.onerror = () => {
            createToast('图片加载失败，请检查文件是否损坏', 'error');
        };

        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = () => {
            createToast('文件读取失败，请重试', 'error');
        };
        reader.readAsDataURL(file);
    }

    // 处理压缩结果
    function handleCompressedResult(blob, originalSize, quality) {
        if (!blob) return;

        const compressedUrl = URL.createObjectURL(blob);
        compressedImage.src = compressedUrl;
        compressedSize.textContent = formatFileSize(blob.size);

        const compressionRatio = ((1 - blob.size / originalSize) * 100).toFixed(1);
        const displayQuality = Math.round(quality * 100);

        if (compressionRatio <= 0) {
            qualityValue.textContent = `${displayQuality}% (无法压缩)`;
            createToast('当前设置无法压缩图片，请调整参数', 'warning');
        } else {
            qualityValue.textContent = `${displayQuality}% (减小了 ${compressionRatio}%)`;
        }

        downloadBtn.disabled = false;

        // 输出压缩信息
        console.log({
            '原始大小': formatFileSize(originalSize),
            '压缩后大小': formatFileSize(blob.size),
            '压缩质量': displayQuality + '%',
            '压缩比例': compressionRatio + '%'
        });
    }

    // 下载按钮点击事件处理
    downloadBtn.addEventListener('click', () => {
        if (compressedImage.src) {                                // 检查是否有压缩后的图片
            const link = document.createElement('a');              // 创建下载链接
            // 处理100%质量的情况
            if (qualitySlider.value === '100') {
                link.download = currentFile.name;                  // 使用原始文件名
                const reader = new FileReader();
                reader.onload = (e) => {
                    link.href = e.target.result;                  // 设置下载链接
                    link.click();                                 // 触发下载
                };
                reader.readAsDataURL(currentFile);
            } else {
                link.download = 'compressed-' + currentFile.name;  // 添加compressed-前缀
                link.href = compressedImage.src;                  // 设置压缩后的图片链接
                link.click();                                     // 触发下载
            }
        }
    });

    // 文件大小格式化函数
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 KB';                          // 处理0字节的情况
        const k = 1024;                                          // 定义单位进制
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];              // 定义单位数组
        const i = Math.floor(Math.log(bytes) / Math.log(k));    // 计算单位索引
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; // 格式化大小
    }

    // 添加图片预加载
    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    // 添加分片处理
    function chunkProcessImage(file, chunkSize) {
        const chunks = Math.ceil(file.size / chunkSize);
        return Array.from({ length: chunks }, (_, i) => {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            return file.slice(start, end);
        });
    }

    // 添加进度提示
    function updateProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
    }

    // 添加压缩历史
    const compressionHistory = {
        add(file, result) {
            const history = JSON.parse(localStorage.getItem('compressionHistory') || '[]');
            history.push({
                filename: file.name,
                originalSize: file.size,
                compressedSize: result.size,
                date: new Date().toISOString()
            });
            localStorage.setItem('compressionHistory', JSON.stringify(history));
        }
    };

    // 添加格式转换
    function convertFormat(blob, format) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, `image/${format}`);
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    // 添加错误处理和重试机制
    async function compressWithRetry(file, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await compressImage(file);
            } catch (error) {
                console.error(`压缩失败，第 ${i + 1} 次重试`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // 添加状态管理
    const CompressorState = {
        IDLE: 'idle',
        LOADING: 'loading',
        COMPRESSING: 'compressing',
        DONE: 'done',
        ERROR: 'error'
    };

    class ImageCompressor {
        constructor() {
            this.state = CompressorState.IDLE;
            this.currentFile = null;
            this.history = [];
        }
        
        setState(newState) {
            this.state = newState;
            this.updateUI();
        }
    }

    // 添加安全检查
    function validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        
        if (file.size > maxSize) {
            throw new Error('文件大小超过限制');
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('不支持的文件类型');
        }
        
        return true;
    }

    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            color: white;
            z-index: 1000;
            animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
        }
        .toast-error { background-color: #ff4444; }
        .toast-warning { background-color: #ffbb33; }
        .toast-info { background-color: #33b5e5; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
}); 