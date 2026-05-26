import os
import sys
from PyPDF2 import PdfReader

def extract_pdf_content(pdf_path):
    """提取PDF文件所有内容"""
    try:
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        print(f"Total pages: {total_pages}")
        print("=" * 50)
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            print(f"--- Page {i+1} ---")
            if text:
                print(text)
            else:
                print("(Empty page)")
            print("-" * 50)
        
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf_full.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(f"Error: 文件不存在 - {pdf_path}")
        sys.exit(1)
    
    extract_pdf_content(pdf_path)

if __name__ == "__main__":
    main()