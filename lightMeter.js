// 测光表应用JavaScript

// 全局变量
let videoStream = null;
let imageCapture = null;
let currentISO = 100;
let currentShutterIndex = 9; // 默认1/100
let currentExposureCompensation = 0;

// 标准快门速度序列（从快到慢）
const shutterSpeeds = [
    '1/8000', '1/4000', '1/2000', '1/1000', '1/500', 
    '1/250', '1/125', '1/60', '1/30', '1/15', 
    '1/8', '1/4', '1/2', '2'
];

// DOM元素
const videoElement = document.getElementById('camera-preview');
const startCameraButton = document.getElementById('start-camera');
const stopCameraButton = document.getElementById('stop-camera');
const apertureValueElement = document.getElementById('aperture-value');
const isoValueElement = document.getElementById('iso-value');
const shutterValueElement = document.getElementById('shutter-value');
const exposureValueElement = document.getElementById('exposure-value');
const isoSlider = document.getElementById('iso-slider');
const isoSliderValue = document.getElementById('iso-slider-value');
const shutterSlider = document.getElementById('shutter-slider');
const shutterSliderValue = document.getElementById('shutter-slider-value');
const ecDisplay = document.getElementById('ec-display');
const ecButtons = document.querySelectorAll('.ec-button');

// 初始化应用
function initApp() {
    // 设置初始值
    updateISOValue(100);
    updateShutterValue(9);
    updateExposureCompensation(0);

    // 添加事件监听器
    startCameraButton.addEventListener('click', startCamera);
    stopCameraButton.addEventListener('click', stopCamera);
    isoSlider.addEventListener('input', handleISOChange);
    shutterSlider.addEventListener('input', handleShutterChange);
    ecButtons.forEach(button => {
        button.addEventListener('click', handleExposureCompensationChange);
    });
}

// 启动摄像头
async function startCamera() {
    try {
        // 请求摄像头权限
        const constraints = {
            video: {
                facingMode: 'environment', // 优先使用后置摄像头
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = videoStream;

        // 获取视频轨道以访问摄像头参数
        const videoTrack = videoStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();

        // 创建ImageCapture对象
        imageCapture = new ImageCapture(videoTrack);

        // 尝试获取光圈值
        if (capabilities.aperture) {
            // 设置光圈为当前值
            if (videoTrack.applyConstraints) {
                try {
                    await videoTrack.applyConstraints({
                    advanced: [{ aperture: capabilities.aperture.max }]
                });
                updateApertureValue(capabilities.aperture.max);
                } catch (error) {
                    console.error('无法设置光圈值:', error);
                    updateApertureValue('--');
                }
            }
        } else {
            updateApertureValue('--');
        }

        // 应用当前的ISO和快门速度
        applyCameraSettings();

    } catch (error) {
        console.error('无法访问摄像头:', error);
        alert('无法访问摄像头，请确保已授予权限。');
    }
}

// 停止摄像头
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
        videoStream = null;
        imageCapture = null;
        updateApertureValue('--');
    }
}

// 更新光圈值显示
function updateApertureValue(value) {
    if (value !== '--') {
        apertureValueElement.textContent = `f/${value}`;
    } else {
        apertureValueElement.textContent = '--';
    }
}

// 处理ISO变化
function handleISOChange(event) {
    const isoValue = parseInt(event.target.value);
    updateISOValue(isoValue);
    applyCameraSettings();
}

// 更新ISO值显示
function updateISOValue(value) {
    currentISO = value;
    isoValueElement.textContent = value;
    isoSliderValue.textContent = value;
    isoSlider.value = value;
}

// 处理快门速度变化
function handleShutterChange(event) {
    const shutterIndex = parseInt(event.target.value);
    updateShutterValue(shutterIndex);
    applyCameraSettings();
}

// 更新快门速度显示
function updateShutterValue(index) {
    currentShutterIndex = index;
    const shutterValue = shutterSpeeds[index];
    shutterValueElement.textContent = shutterValue;
    shutterSliderValue.textContent = shutterValue;
    shutterSlider.value = index;
}

// 处理曝光补偿变化
function handleExposureCompensationChange(event) {
    const value = parseFloat(event.target.dataset.value);
    const newCompensation = currentExposureCompensation + value;

    // 限制曝光补偿范围 (-3EV 到 +3EV)
    const clampedCompensation = Math.max(-3, Math.min(3, newCompensation));
    updateExposureCompensation(clampedCompensation);
    applyCameraSettings();
}

// 更新曝光补偿显示
function updateExposureCompensation(value) {
    currentExposureCompensation = value;
    const sign = value > 0 ? '+' : '';
    exposureValueElement.textContent = `${sign}${value.toFixed(2)} EV`;
    ecDisplay.textContent = `${sign}${value.toFixed(2)} EV`;
}

// 应用摄像头设置
async function applyCameraSettings() {
    if (!videoStream) return;

    try {
        const videoTrack = videoStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();
        const constraints = {};

        // 设置ISO
        if (capabilities.iso) {
            constraints.iso = currentISO;
        }

        // 设置快门速度
        if (capabilities.exposureTime) {
            // 将快门速度转换为秒
            const shutterValue = shutterSpeeds[currentShutterIndex];
            let exposureTime;

            if (shutterValue.includes('/')) {
                const parts = shutterValue.split('/');
                exposureTime = 1 / parseInt(parts[1]);
            } else {
                exposureTime = parseFloat(shutterValue);
            }

            // 确保快门速度在支持范围内
            const minExposureTime = capabilities.exposureTime.min || 0.0001;
            const maxExposureTime = capabilities.exposureTime.max || 2;
            exposureTime = Math.max(minExposureTime, Math.min(maxExposureTime, exposureTime));

            constraints.exposureTime = exposureTime;
        }

        // 设置曝光补偿
        if (capabilities.exposureCompensation) {
            const minComp = capabilities.exposureCompensation.min || -3;
            const maxComp = capabilities.exposureCompensation.max || 3;
            const clampedComp = Math.max(minComp, Math.min(maxComp, currentExposureCompensation));
            constraints.exposureCompensation = clampedComp;
        }

        // 应用约束
        if (Object.keys(constraints).length > 0) {
            await videoTrack.applyConstraints({
                advanced: [constraints]
            });
        }

    } catch (error) {
        console.error('无法应用摄像头设置:', error);
    }
}

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
