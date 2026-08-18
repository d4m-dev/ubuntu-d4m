# -*- coding: utf-8 -*-
import os
import re
import io
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# Phạm vi truy cập (Scopes) yêu cầu toàn quyền xử lý Drive
SCOPES = ['https://www.googleapis.com/auth/drive']

def authenticate():
    """Xác thực người dùng và trả về dịch vụ Google Drive API."""
    creds = None
    # Thay thế bằng đường dẫn đến file credentials.json của bạn nếu cần
    cred_path = 'credentials.json'
    token_path = 'token.json'
    
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(cred_path):
                print(f"[-] Không tìm thấy file '{cred_path}'. Vui lòng tải file JSON cấu hình từ Google Cloud Console về thư mục hiện tại.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(cred_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
            
    return build('drive', 'v3', credentials=creds)

def extract_id(url_or_id):
    """Trích xuất Folder ID hoặc File ID từ đường dẫn Google Drive URL."""
    if not url_or_id:
        return None
    # Regex để tìm ID từ URL Google Drive
    match = re.search(r'folders/([a-zA-Z0-9-_]+)', url_or_id)
    if match:
        return match.group(1)
    match = re.search(r'id=([a-zA-Z0-9-_]+)', url_or_id)
    if match:
        return match.group(1)
    # Nếu không khớp URL, coi như chuỗi nhập vào chính là ID
    return url_or_id

def get_folder_name(service, folder_id):
    """Lấy tên của thư mục từ ID."""
    try:
        folder = service.files().get(fileId=folder_id, fields='name').execute()
        return folder.get('name')
    except Exception as e:
        print(f"[-] Lỗi khi lấy thông tin thư mục: {e}")
        return "Unknown_Folder"

def download_file(service, file_id, file_name, destination_path):
    """Tải một file đơn lẻ về máy."""
    print(f"[+] Đang tải file: {file_name}...")
    try:
        request = service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            if status:
                print(f"    Tải thư mục... {int(status.progress() * 100)}%", end='\r')
        
        # Ghi nội dung vào file cục bộ
        full_path = os.path.join(destination_path, file_name)
        with open(full_path, 'wb') as f:
            f.write(fh.getvalue())
        print(f"[✓] Đã lưu: {full_path}")
    except Exception as e:
        print(f"[-] Lỗi khi tải file {file_name}: {e}")

def download_folder_recursive(service, folder_id, local_dir):
    """Đệ quy tải toàn bộ thư mục và cấu trúc con về máy cục bộ."""
    if not os.path.exists(local_dir):
        os.makedirs(local_dir, exist_ok=True)
        
    query = f"'{folder_id}' in parents and trashed = false"
    page_token = None
    
    while True:
        results = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token
        ).execute()
        
        items = results.get('files', [])
        for item in items:
            # Nếu là thư mục, tiến hành đệ quy tạo thư mục con và tải tiếp
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                sub_folder_path = os.path.join(local_dir, item['name'])
                download_folder_recursive(service, item['id'], sub_folder_path)
            else:
                # Nếu là file thông thường (loại trừ tài liệu dạng Google Docs online cần export)
                if 'application/vnd.google-apps' in item['mimeType']:
                    print(f"[!] Bỏ qua file Google Workspace định dạng trực tuyến: {item['name']} (Cần xuất định dạng thủ công)")
                    continue
                download_file(service, item['id'], item['name'], local_dir)
                
        page_token = results.get('nextPageToken', None)
        if not page_token:
            break

def copy_folder_recursive(service, source_folder_id, target_parent_id):
    """Đệ quy sao chép cấu trúc thư mục từ Drive sang Drive (Server-to-Server)."""
    source_name = get_folder_name(service, source_folder_id)
    print(f"[+] Đang sao chép thư mục: {source_name} vào thư mục đích...")
    
    # Tạo thư mục mới tại vị trí đích
    folder_metadata = {
        'name': source_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [target_parent_id] if target_parent_id else []
    }
    
    try:
        new_folder = service.files().create(body=folder_metadata, fields='id').execute()
        new_folder_id = new_folder.get('id')
    except Exception as e:
        print(f"[-] Không thể tạo thư mục đích: {e}")
        return

    query = f"'{source_folder_id}' in parents and trashed = false"
    page_token = None
    
    while True:
        results = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token
        ).execute()
        
        items = results.get('files', [])
        for item in items:
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                # Đệ quy sao chép thư mục con
                copy_folder_recursive(service, item['id'], new_folder_id)
            else:
                # Sao chép file trực tiếp trên server Google Drive
                print(f"    -> Sao chép file: {item['name']}")
                copied_file_metadata = {
                    'name': item['name'],
                    'parents': [new_folder_id]
                }
                try:
                    service.files().copy(fileId=item['id'], body=copied_file_metadata).execute()
                except Exception as e:
                    print(f"    [-] Lỗi khi sao chép file {item['name']}: {e}")
                    
        page_token = results.get('nextPageToken', None)
        if not page_token:
            break
            
    print(f"[✓] Đã sao chép xong thư mục: {source_name}")

def main():
    print("="*60)
    print(" CÔNG CỤ TẢI & SAO CHÉP THƯ MỤC GOOGLE DRIVE ".center(60, "="))
    print("="*60)
    
    service = authenticate()
    if not service:
        print("[-] Khởi tạo dịch vụ thất bại. Vui lòng kiểm tra lại cấu hình OAuth2.")
        return

    print("\nChọn cơ chế hoạt động:")
    print("1. Tải thư mục trên Google Drive về máy cục bộ (/sdcard/Download...)")
    print("2. Sao chép thư mục Google Drive sang một thư mục Drive khác (Drive to Drive)")
    
    choice = input("Nhập lựa chọn của bạn (1 hoặc 2): ").strip()
    
    if choice == '1':
        url_input = input("\nNhập URL hoặc ID thư mục Google Drive cần tải: ").strip()
        folder_id = extract_id(url_input)
        
        if not folder_id:
            print("[-] ID thư mục không hợp lệ.")
            return
            
        default_path = "/sdcard/Download"
        custom_path = input(f"Nhập đường dẫn lưu file (Ấn Enter để dùng mặc định: {default_path}): ").strip()
        destination = custom_path if custom_path else default_path
        
        folder_name = get_folder_name(service, folder_id)
        final_destination = os.path.join(destination, folder_name)
        
        print(f"\n[+] Bắt đầu tải thư mục '{folder_name}' về '{final_destination}'...")
        download_folder_recursive(service, folder_id, final_destination)
        print("\n[✓] QUÁ TRÌNH TẢI HOÀN TẤT!")
        
    elif choice == '2':
        src_input = input("\nNhập URL hoặc ID thư mục NGUỒN (Source Folder): ").strip()
        dest_input = input("Nhập URL hoặc ID thư mục ĐÍCH (Target Parent Folder - Để trống nếu muốn lưu ở thư mục gốc My Drive): ").strip()
        
        source_id = extract_id(src_input)
        target_id = extract_id(dest_input) if dest_input else 'root'
        
        if not source_id:
            print("[-] ID thư mục nguồn không hợp lệ.")
            return
            
        print(f"\n[+] Bắt đầu sao chép Drive to Drive...")
        copy_folder_recursive(service, source_id, target_id)
        print("\n[✓] QUÁ TRÌNH SAO CHÉP HOÀN TẤT!")
        
    else:
        print("[-] Lựa chọn không hợp lệ.")

if __name__ == '__main__':
    main()