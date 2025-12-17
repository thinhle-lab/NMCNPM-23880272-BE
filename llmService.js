import axios from "axios";
import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_API_KEY);


// Ví dụ dùng một API model miễn phí hoặc local model giả lập
export async function generateReply(messages) {
    try {
        const data = {
            model: "google/gemma-2-9b-it",
            messages: messages,
            temperature: 0.7,
            max_tokens: 200,
        };

        const response = await fetch(
            "https://router.huggingface.co/v1/chat/completions",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_KEY}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();
        // console.log('Result:', result?.choices[0].message);
        // Phản hồi từ thư viện này đã được tinh gọn, 
        // bạn chỉ cần truy cập thuộc tính generated_text
        const reply = result?.choices[0]?.message?.content || "Sorry, I didn’t get that.";

        if (!reply) throw new Error("Empty model response");
        return reply;
    } catch (error) {
        console.error("Error:", error);
        console.error("Lỗi khi gọi API Hugging Face:", error.message);
        // Kiểm tra lỗi chi tiết hơn nếu có
        res.status(500).json({ error: "Đã xảy ra lỗi khi tạo văn bản.", details: error.message });
    }
}