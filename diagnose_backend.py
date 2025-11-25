import requests
import os
import sys

# 配置
BASE_URL = "http://127.0.0.1:8000"
TEST_PDF_PATH = "sample.pdf"

def create_dummy_pdf():
    """创建一个有效的最小 PDF 文件"""
    # 这是一个有效的最小 PDF 文件结构
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n223\n%%EOF\n"
    )
    with open(TEST_PDF_PATH, "wb") as f:
        f.write(minimal_pdf)
    print(f"✅ Created valid minimal PDF: {TEST_PDF_PATH}")

def check_backend_version():
    """检查后端版本"""
    try:
        response = requests.get(f"{BASE_URL}/version")
        if response.status_code == 200:
            data = response.json()
            print(f"ℹ️  Backend Version: {data.get('version')} (Build: {data.get('build_time')})")
            if data.get("feature") == "native_pdf_url":
                print("✅ Backend has 'native_pdf_url' feature")
                return True
            else:
                print("❌ Backend is running OLD code (missing feature flag)")
                return False
        else:
            print("⚠️  /version endpoint not found (Backend is likely old)")
            return False
    except Exception:
        print("⚠️  Could not check version")
        return False

def check_backend_health():
    """检查后端健康状态"""
    check_backend_version() # 先检查版本
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Is it running?")
        return False

def test_upload():
    """测试上传功能"""
    # 总是重新创建 PDF 以确保有效
    if os.path.exists(TEST_PDF_PATH):
        os.remove(TEST_PDF_PATH)
    
    create_dummy_pdf()
    
    print(f"📤 Uploading {TEST_PDF_PATH}...")
    
    with open(TEST_PDF_PATH, "rb") as f:
        files = {"file": (TEST_PDF_PATH, f, "application/pdf")}
        try:
            response = requests.post(f"{BASE_URL}/upload", files=files)
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Upload successful")
                print(f"📄 Response keys: {list(data.keys())}")
                
                if "pdf_url" in data:
                    print(f"✅ pdf_url found: {data['pdf_url']}")
                    
                    # 验证文件是否真的存在于磁盘
                    pdf_filename = data['pdf_url'].split('/')[-1]
                    local_path = os.path.join("uploads", pdf_filename)
                    if os.path.exists(local_path):
                        print(f"✅ File exists on disk: {local_path}")
                    else:
                        print(f"❌ File NOT found on disk: {local_path}")
                        
                    # 验证静态文件访问
                    static_url = f"{BASE_URL}{data['pdf_url']}"
                    print(f"🔍 Checking static access: {static_url}")
                    static_res = requests.get(static_url)
                    if static_res.status_code == 200:
                        print("✅ Static file access successful")
                    else:
                        print(f"❌ Static file access failed: {static_res.status_code}")
                        
                else:
                    print("❌ pdf_url MISSING in response!")
                    print(f"Response data: {data}")
            else:
                print(f"❌ Upload failed: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ Error during upload: {str(e)}")

if __name__ == "__main__":
    print("🔍 Starting Backend Diagnosis...")
    
    # 检查 uploads 目录
    if os.path.exists("uploads"):
        print(f"✅ 'uploads' directory exists. Permissions: {oct(os.stat('uploads').st_mode)[-3:]}")
    else:
        print("❌ 'uploads' directory MISSING!")
        try:
            os.makedirs("uploads")
            print("✅ Created 'uploads' directory")
        except Exception as e:
            print(f"❌ Failed to create 'uploads' directory: {e}")

    if check_backend_health():
        test_upload()
    
    # 清理
    if os.path.exists(TEST_PDF_PATH):
        os.remove(TEST_PDF_PATH)
