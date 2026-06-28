import pkg_resources
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Dict, String, Scope

class MyXBlock(XBlock):
    # ==========================================
    # 0. CẤU HÌNH GIAO DIỆN CHUNG
    # ==========================================
    display_name = String(
        display_name="Display Name",
        default="Toeic", # Tên mặc định sẽ hiển thị thay cho chuỗi ID
        scope=Scope.settings,
        help="Tên hiển thị của học liệu trên giao diện."
    )

    # ==========================================
    # 1. KHAI BÁO CƠ SỞ DỮ LIỆU CỦA EDX
    # ==========================================
    exam_data_json = Dict(default={}, scope=Scope.settings, help="Cấu trúc câu hỏi")
    exam_settings_json = Dict(default={}, scope=Scope.settings, help="Cài đặt bài thi")
    builder_mode = String(default="traditional", scope=Scope.settings)
    user_progress = Dict(default={}, scope=Scope.user_state, help="Tiến độ học viên")

    def resource_string(self, path):
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # ==========================================
    # 2. RENDER GIAO DIỆN
    # ==========================================
    def studio_view(self, context=None):
        """ Giao diện Giáo viên (Edit Mode) """
        html = self.resource_string("static/html/studio_view.html")
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/toeic_builder_bundle.css"))
        frag.add_javascript(self.resource_string("static/js/toeic_builder_bundle.js"))
        
        # BƠM TRỰC TIẾP URL VÀO VUE.JS
        frag.initialize_js('ToeicAppInit', {
            'mode': 'teacher',
            'get_url': self.runtime.handler_url(self, 'get_exam_data'),
            'save_url': self.runtime.handler_url(self, 'save_exam_data'),
            'submit_url': self.runtime.handler_url(self, 'submit_exam')
        })
        return frag

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
            'submit_url': self.runtime.handler_url(self, 'submit_exam')
        })
        return frag

    # ==========================================
    # 3. API NHẬN/TRẢ DỮ LIỆU VỚI VUE.JS
    # ==========================================
    @XBlock.json_handler
    def get_exam_data(self, data, suffix=''):
        return {
            "examData": self.exam_data_json,
            "examSettings": self.exam_settings_json,
            "builderMode": self.builder_mode,
            "userAnswers": self.user_progress
        }

    @XBlock.json_handler
    def save_exam_data(self, data, suffix=''):
        self.exam_data_json = data.get('examData', {})
        self.exam_settings_json = data.get('examSettings', {})
        self.builder_mode = data.get('builderMode', 'traditional')
        return {"status": "success"}

    @XBlock.json_handler
    def submit_exam(self, data, suffix=''):
        self.user_progress = data.get('userAnswers', {})
        score = data.get('score', 0)
        max_score = data.get('maxScore', 1)
        # Ghi điểm vào Sổ điểm (Gradebook) của edX
        self.runtime.publish(self, 'grade', {
            'value': score,
            'max_value': max_score
        })
        return {"status": "success", "score": score}