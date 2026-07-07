import pkg_resources
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Dict, String, Scope, Boolean
from webob import Response  # Thư viện xử lý trả về tệp tin

class MyXBlock(XBlock):
    # ==========================================
    # 0. CẤU HÌNH GIAO DIỆN CHUNG
    # ==========================================
    display_name = String(
        display_name="Display Name",
        default="Toeic Exam", 
        scope=Scope.settings,
        help="Tên hiển thị của học liệu trên giao diện."
    )
    
    has_score = True
    icon_class = 'problem'

    # khai báo cơ sở dữ liệu Edx
    exam_data_json = Dict(default={}, scope=Scope.settings, help="Cấu trúc câu hỏi")
    exam_settings_json = Dict(default={}, scope=Scope.settings, help="Cài đặt bài thi")
    builder_mode = String(default="traditional", scope=Scope.settings)
    
    user_progress = Dict(default={}, scope=Scope.user_state, help="Tiến độ học viên")

    def resource_string(self, path):
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

   
    # giao diện studio / teacher
    def studio_view(self, context=None):
        """ Giao diện Giáo viên (Edit Mode) """
        html = self.resource_string("static/html/studio_view.html")
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/toeic_builder_bundle.css"))
        frag.add_javascript(self.resource_string("static/js/toeic_builder_bundle.js"))
        
        frag.initialize_js('ToeicAppInit', {
            'mode': 'teacher',
            'get_url': self.runtime.handler_url(self, 'get_exam_data'),
            'save_url': self.runtime.handler_url(self, 'save_exam_data'),
            'submit_url': self.runtime.handler_url(self, 'submit_exam'),
            'download_url': self.runtime.handler_url(self, 'download_export_file')
        })
        return frag


    # giao diện student
    def student_view(self, context=None):
        """ Giao diện Học viên (View Mode) """
        html = self.resource_string("static/html/student_view.html")
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/toeic_builder_bundle.css"))
        frag.add_javascript(self.resource_string("static/js/toeic_builder_bundle.js"))
        
        frag.initialize_js('ToeicAppInit', {
            'mode': 'student',
            'get_url': self.runtime.handler_url(self, 'get_exam_data'),
            'save_url': '',
            'submit_url': self.runtime.handler_url(self, 'submit_exam'),
            'heartbeat_url': self.runtime.handler_url(self, 'check_concurrent_login')
        })
        return frag

    
    # Edx <---> vue
    @XBlock.json_handler
    def get_exam_data(self, data, suffix=''):
        answers = self.user_progress.get('answers', {}) if 'answers' in self.user_progress else self.user_progress
        is_submitted = self.user_progress.get('isSubmitted', False) if isinstance(self.user_progress, dict) else False

        return {
            "examData": self.exam_data_json,
            "examSettings": self.exam_settings_json,
            "builderMode": self.builder_mode,
            "userAnswers": answers,
            "isSubmitted": is_submitted
        }

    @XBlock.json_handler
    def save_exam_data(self, data, suffix=''):
        self.exam_data_json = data.get('examData', {})
        self.exam_settings_json = data.get('examSettings', {})
        self.builder_mode = data.get('builderMode', 'traditional')
        return {"status": "success"}

    @XBlock.json_handler
    def submit_exam(self, data, suffix=''):
        # Bảo toàn token quản lý thiết bị khi nộp bài
        current_token = self.user_progress.get('active_device_token') if isinstance(self.user_progress, dict) else None
        
        self.user_progress = {
            "answers": data.get('userAnswers', {}),
            "isSubmitted": True,
            "active_device_token": current_token
        }
        
        score = data.get('score', 0)
        max_score = data.get('maxScore', 1)
        
        self.runtime.publish(self, 'grade', {
            'value': score,
            'max_value': max_score
        })
        
        return {"status": "success", "score": score}



    @XBlock.handler
    def download_export_file(self, request, suffix=''):
        file_content = request.POST.get('file_content', '')
        file_name = request.POST.get('file_name', 'export.txt')
        mime_type = request.POST.get('mime_type', 'text/plain')

        encoded_content = '\ufeff' + file_content
        byte_content = encoded_content.encode('utf-8')

        response = Response(byte_content)
        response.content_type = f"{mime_type}; charset=utf-8"
        response.content_disposition = f'attachment; filename="{file_name}"'
        
        return response

   
    @XBlock.json_handler
    def check_concurrent_login(self, data, suffix=''):
        client_token = data.get('deviceToken')
        is_initial_load = data.get('isInitialLoad', False)
        
        # Đảm bảo user_progress là dictionary
        if not isinstance(self.user_progress, dict):
            self.user_progress = {}

        current_active_token = self.user_progress.get('active_device_token')

        # Lần đầu mở bài -> Lấy token thiết bị
        if is_initial_load or not current_active_token:
            self.user_progress['active_device_token'] = client_token
            return {"status": "ok", "action": "allow"}

        # Thiết bị hiện tại bị khác với thiết bị lưu trong DB -> Đã bị đăng nhập nơi khác
        if current_active_token != client_token:
            return {"status": "conflict", "action": "kick"}

        # Token khớp -> làm tiếp
        return {"status": "ok", "action": "allow"}