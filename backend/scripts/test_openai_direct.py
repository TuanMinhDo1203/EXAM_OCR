import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json

from app.services.llm_grading import evaluate_ocr_with_ai

def main():
    system_prompt = "Hãy châm chước lỗi syntax python. Thấy có dùng đệ quy là cho điểm TỐI ĐA (10/10)."
    problem_description = "Viết hàm tính giai thừa của N bằng đệ quy."
    
    # Text extracted from the "Banana Pro" handwritten image generated earlier
    ocr_text = "def faktorial(n):\n  if n == 1 returm 1\n  returm n * fctorial(n - 1)\n"
    
    print("==================================================")
    print("🚀 BẮT ĐẦU TEST LUỒNG OPENAI GRADING ĐỘC LẬP")
    print("==================================================")
    print(f"📌 Đề bài: {problem_description}")
    print(f"📌 System Prompt: {system_prompt}")
    print(f"📌 OCR Code (từ ảnh mộc): \n{ocr_text}")
    print("--------------------------------------------------")
    print("Đang gửi Request lên OpenAI (GPT-4o Structured Outputs)... Xin chờ lấy JSON...\n")
    
    result = evaluate_ocr_with_ai(system_prompt, problem_description, ocr_text)
    
    if result:
        print("✅ [THÀNH CÔNG] - GPT-4o ĐÃ PHẢN HỒI:")
        print(f"🏆 ĐIỂM SỐ TỔNG QUÁT: {result.overall_score} / 10\n")
        
        # In đẹp JSON
        parsed_json = json.loads(result.model_dump_json())
        print(json.dumps(parsed_json, indent=4, ensure_ascii=False))
    else:
        print("❌ Gặp lỗi bảo mật OpenAI hoặc lỗi mạng!")

if __name__ == "__main__":
    main()
