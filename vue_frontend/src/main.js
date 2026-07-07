import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useExamStore } from './store/examStore';

window.ToeicAppInit = function (runtime, element, init_data) {
    console.log("==========================================");
    const domElement = element.jquery ? element[0] : element;
    console.log("DOM Element gốc của edX:", domElement);

    const wrapper = domElement.querySelector('.toeic-xblock-wrapper');
    console.log("Thẻ Wrapper tìm thấy:", wrapper);

    if (!wrapper) {
        console.error("Không tìm thấy thẻ .toeic-xblock-wrapper");
        return {};
    }

    const htmlMode = wrapper.getAttribute('data-mode');

    const config = init_data || {};
    console.log("dữ liệu python truyền sang:", config);

    // Thuật toán ưu tiên: Lấy từ HTML trước, nếu không có mới lấy từ Python
    const finalMode = htmlMode || config.mode || 'student';
    console.log("final mode:", finalMode);

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
    
    // đổi từ #toeic-app-root SANG .toeic-app-mount-point
    app.mount(wrapper.querySelector('.toeic-app-mount-point'));

    console.log("mount thành công");
    console.log("==========================================");
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