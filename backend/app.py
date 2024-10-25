from fastapi import FastAPI, UploadFile, File, HTTPException, Request
import os
import time
import tempfile
import easyocr
import pytesseract
from paddleocr import PaddleOCR
from pdf2image import convert_from_path
from PIL import Image
import numpy as np
import traceback
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import create_client
# from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM

# Supabase configuration
supabase_url = 'https://ablkgjbdtdxuqajglwpi.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibGtnamJkdGR4dXFhamdsd3BpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYwNTk5NSwiZXhwIjoyMDQ1MTgxOTk1fQ.gSxDkO3d1DljyUTADog1ZJqddbcwmNpbALWNGO35EJs'

supabase = create_client(supabase_url, supabase_key)

# Set the Tesseract command path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
poppler_path = r"C:\poppler-24.08.0\Library\bin"
os.environ["PATH"] += os.pathsep + poppler_path

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR models
reader_easyocr = easyocr.Reader(['en'])
reader_paddleocr = PaddleOCR()

# Temporary directory
TEMP_DIR = tempfile.mkdtemp()

# Initialize the model and tokenizer for text generation
# model_name = "mychen76/mistral7b_ocr_to_json_v1"
# tokenizer = AutoTokenizer.from_pretrained(model_name)
# model = AutoModelForCausalLM.from_pretrained(model_name)
# model.config.pad_token_id = tokenizer.pad_token_id or tokenizer.eos_token_id
# nlp_pipeline = pipeline("text-generation", model=model, tokenizer=tokenizer)

# @app.post("/analyze/")
# async def analyze_devis(request: Request):
#     try:
#         data = await request.json()
#         json_data = data.get("json")
# 
#         if not json_data:
#             raise HTTPException(status_code=400, detail="Invalid input")
# 
#         prompt = f"### Instruction:\nYou are a POS receipt data expert. Parse, detect, recognize, and convert the following OCR result into a structured JSON object:\n\n### Input:\n{json_data}\n\n### Output:"
#         print("Prompt sent to model:", prompt)
# 
#         response = nlp_pipeline(prompt, max_new_tokens=512)
#         result = response[0]["generated_text"]
#         print("Model result:", result)
# 
#         return {"result": result}
# 
#     except Exception as e:
#         print(f"Error analyzing the receipt: {e}")
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Error analyzing the receipt: {str(e)}")

# The rest of the upload logic remains unchanged

def make_serializable(data):
    if isinstance(data, list):
        return [make_serializable(item) for item in data]
    elif isinstance(data, dict):
        return {key: make_serializable(value) for key, value in data.items()}
    elif isinstance(data, (np.ndarray, np.generic)):
        return data.tolist()
    elif isinstance(data, (np.int32, np.int64, np.integer)):
        return int(data)
    elif isinstance(data, (np.float32, np.float64, np.floating)):
        return float(data)
    elif isinstance(data, tuple):
        return tuple(make_serializable(item) for item in data)
    return data

def upload_to_supabase(bucket_name, file_path, file_name):
    with open(file_path, 'rb') as file:
        response = supabase.storage.from_(bucket_name).upload(file_name, file)
    
    if hasattr(response, 'status_code') and response.status_code >= 400:
        response_json = response.json()
        if response_json.get('error') == 'Duplicate':
            print(f"File {file_name} already exists in bucket {bucket_name}. Skipping upload.")
        else:
            raise Exception(f"Supabase upload error: {response_json.get('message', 'Unknown error')}")
    
    return file_name

def insert_metadata_to_supabase(table_name, data):
    response = supabase.table(table_name).insert(data).execute()
    if hasattr(response, 'data') and not response.data:
        raise Exception("Supabase insert error: La réponse ne contient pas de données.")
    if hasattr(response, 'error') and response.error:
        raise Exception(f"Supabase insert error: {response.error['message']}")
    return response.data

def insert_kpi_to_supabase(table_name, data):
    try:
        response = supabase.table(table_name).insert(data).execute()
        print("Supabase insertion response:", response)
        if hasattr(response, 'data') and not response.data:
            raise Exception("Supabase insert error: La réponse ne contient pas de données.")
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Supabase insert error: {response.error['message']}")
        return response.data
    except Exception as e:
        print(f"Erreur lors de l'insertion des KPIs: {e}")
        raise

@app.post("/upload/")
async def upload(file: UploadFile = File(...)):
    try:
        # Save the uploaded file temporarily
        temp_file_path = os.path.join(TEMP_DIR, file.filename)
        with open(temp_file_path, "wb") as temp_file:
            content = await file.read()
            temp_file.write(content)

        # Upload the PDF to Supabase storage
        pdf_file_name = f"pdf/{file.filename}"
        upload_to_supabase('ocr_files', temp_file_path, pdf_file_name)

        # Variables to store processing time for each OCR
        easyocr_time = 0
        paddleocr_time = 0
        tesseract_time = 0

        # Process OCR and save results separately
        easyocr_results = []
        paddleocr_results = []
        tesseract_results = []

        if file.filename.lower().endswith('.pdf'):
            images = convert_from_path(temp_file_path, poppler_path=poppler_path)
            for idx, image in enumerate(images):
                image_path = os.path.join(TEMP_DIR, f"temp_image_{idx}.png")
                image.save(image_path, "PNG")

                start_time = time.time()
                easyocr_results.extend(make_serializable(reader_easyocr.readtext(image_path)))
                easyocr_time += time.time() - start_time

                start_time = time.time()
                paddleocr_results.extend(make_serializable(reader_paddleocr.ocr(image_path, cls=True)))
                paddleocr_time += time.time() - start_time

                start_time = time.time()
                tesseract_results.append(pytesseract.image_to_string(Image.open(image_path)))
                tesseract_time += time.time() - start_time

                os.remove(image_path)
        else:
            start_time = time.time()
            easyocr_results = make_serializable(reader_easyocr.readtext(temp_file_path))
            easyocr_time = time.time() - start_time

            start_time = time.time()
            paddleocr_results = make_serializable(reader_paddleocr.ocr(temp_file_path, cls=True))
            paddleocr_time = time.time() - start_time

            start_time = time.time()
            tesseract_results = pytesseract.image_to_string(Image.open(temp_file_path))
            tesseract_time = time.time() - start_time

        # Calculer le nombre de mots détectés pour chaque OCR
        easyocr_word_count = sum(len(result[1].split()) for result in easyocr_results)
        paddleocr_word_count = sum(len(' '.join([str(line[0]) for line in result[1]]).split()) for result in paddleocr_results if isinstance(result[1], list))
        tesseract_text_combined = " ".join(tesseract_results)
        tesseract_word_count = len(tesseract_text_combined.split())

        # Prepare KPI data
        kpi_data = {
            "filename": file.filename,
            "easyocr_time": easyocr_time,
            "paddleocr_time": paddleocr_time,
            "tesseract_time": tesseract_time,
            "easyocr_word_count": easyocr_word_count,
            "paddleocr_word_count": paddleocr_word_count,
            "tesseract_word_count": tesseract_word_count,
            "total_pages": len(images) if file.filename.lower().endswith('.pdf') else 1
        }
        print("KPI Data to be inserted:", kpi_data)
        insert_kpi_to_supabase('ocr_kpis', kpi_data)

        # Save each OCR result as a separate JSON file
        easyocr_json_path = os.path.join(TEMP_DIR, f"{file.filename}_easyocr.json")
        with open(easyocr_json_path, "w", encoding="utf-8") as easyocr_file:
            json.dump(easyocr_results, easyocr_file, ensure_ascii=False)

        paddleocr_json_path = os.path.join(TEMP_DIR, f"{file.filename}_paddleocr.json")
        with open(paddleocr_json_path, "w", encoding="utf-8") as paddleocr_file:
            json.dump(paddleocr_results, paddleocr_file, ensure_ascii=False)

        tesseract_json_path = os.path.join(TEMP_DIR, f"{file.filename}_tesseract.json")
        with open(tesseract_json_path, "w", encoding="utf-8") as tesseract_file:
            json.dump(tesseract_results, tesseract_file, ensure_ascii=False)

        # Upload the JSON files to Supabase storage
        easyocr_json_name = f"result/{file.filename}_easyocr.json"
        paddleocr_json_name = f"result/{file.filename}_paddleocr.json"
        tesseract_json_name = f"result/{file.filename}_tesseract.json"

        upload_to_supabase('ocr_files', easyocr_json_path, easyocr_json_name)
        upload_to_supabase('ocr_files', paddleocr_json_path, paddleocr_json_name)
        upload_to_supabase('ocr_files', tesseract_json_path, tesseract_json_name)

        pdf_data = {
            "filename": file.filename,
            "pdf_path": pdf_file_name,
            "easyocr_result_path": easyocr_json_name,
            "paddleocr_result_path": paddleocr_json_name,
            "tesseract_result_path": tesseract_json_name
        }
        insert_metadata_to_supabase('pdf_files', pdf_data)

        os.remove(temp_file_path)
        os.remove(easyocr_json_path)
        os.remove(paddleocr_json_path)
        os.remove(tesseract_json_path)

        return JSONResponse(content={"message": "File processed and results uploaded successfully."})

    except Exception as e:
        print(f"Error processing file: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
