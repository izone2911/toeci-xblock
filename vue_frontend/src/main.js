import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useExamStore } from './store/examStore';

window.ToeicAppInit = function (runtime, element, init_data) {
    console.log("==========================================");
    console.log("🛑 [RADAR] BẮT ĐẦU CHẠY TOEIC_APP_INIT");
    console.log("==========================================");

    const domElement = element.jquery ? element[0] : element;
    console.log("👉 [1] DOM Element gốc do edX cấp:", domElement);

    const wrapper = domElement.querySelector('.toeic-xblock-wrapper');
    console.log("👉 [2] Thẻ Wrapper tìm thấy:", wrapper);

    if (!wrapper) {
        console.error("❌ LỖI: Không tìm thấy thẻ .toeic-xblock-wrapper trong HTML!");
        return {};
    }

    const htmlMode = wrapper.getAttribute('data-mode');
    console.log("👉 [3] Thẻ 'data-mode' đọc được từ HTML là:", htmlMode);

    const config = init_data || {};
    console.log("👉 [4] Dữ liệu Python (init_data) truyền sang:", config);

    // Thuật toán ưu tiên: Lấy từ HTML trước, nếu không có mới lấy từ Python
    const finalMode = htmlMode || config.mode || 'student';
    console.log("👉 [5] CHỐT HẠ CHẾ ĐỘ SẼ CHẠY (finalMode):", finalMode);

    const pinia = createPinia();
    const app = createApp(App);
    app.use(pinia);

    const store = useExamStore();
    store.setEdxRuntime({
        mode: finalMode,
        getUrl: config.get_url || '',
        saveUrl: config.save_url || '',
        submitUrl: config.submit_url || ''
    });

    store.initExam();
    
    // ĐỔI TỪ #toeic-app-root SANG .toeic-app-mount-point
    app.mount(wrapper.querySelector('.toeic-app-mount-point'));

    console.log("✅ VUE ĐÃ MOUNT THÀNH CÔNG VÀO CLASS!");
    return {};
};

// ==========================================
// Dành cho môi trường DEV Local
// ==========================================
if (import.meta.env.DEV) {
    const pinia = createPinia();
    const app = createApp(App);
    app.use(pinia);
    app.mount('#app');
}