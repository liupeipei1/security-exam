import os
import sys

def extract_pdf_content(pdf_path):
    """提取PDF文件内容"""
    try:
        # 尝试使用PyPDF2
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except ImportError:
            pass
        
        # 尝试使用pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
            return text
        except ImportError:
            pass
        
        return "Error: 未找到PDF处理库，请安装PyPDF2或pdfplumber"
    
    except Exception as e:
        return f"Error: {str(e)}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(f"Error: 文件不存在 - {pdf_path}")
        sys.exit(1)
    
    content = extract_pdf_content(pdf_path)
    print(content)

if __name__ == "__main__":
    main()