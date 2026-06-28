import os
from setuptools import setup

def package_data(pkg, roots):
    """Hàm hỗ trợ quét và khai báo toàn bộ các file tĩnh (HTML, CSS, JS)"""
    data = []
    for root in roots:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))
    return {pkg: data}

setup(
    name='myxblock',
    version='0.1',
    description='TOEIC Exam Builder XBlock',
    packages=['myxblock'],
    install_requires=[
        'XBlock',
    ],
    # ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT: Đăng ký module với edX
    entry_points={
        'xblock.v1': [
            'myxblock = myxblock.myxblock:MyXBlock',
        ]
    },
    # Khai báo để edX cho phép tải các file giao diện Vue của bạn
    package_data=package_data("myxblock", ["static"]),
)