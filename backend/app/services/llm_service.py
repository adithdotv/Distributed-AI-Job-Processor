from google import genai

from app.config import settings


client = genai.Client(
    api_key=settings.gemini_api_key
)


def generate_result(input_data: str) -> str:
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=(
            "You are a document processing assistant. "
            "Process the following input and return a "
            "clear, concise, useful response.\n\n"
            f"Input:\n{input_data}"
        ),
    )

    result = response.text

    if not result:
        raise RuntimeError("Gemini returned an empty response")

    return result