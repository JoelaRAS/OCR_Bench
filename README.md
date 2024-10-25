# OCR-Benchmarker

OCR-Benchmarker is a comprehensive application designed to compare the performance of three OCR engines: Tesseract, EasyOCR, and PaddleOCR. The project extracts text from PDF files, compares results in terms of accuracy and speed, and stores these results in a Supabase database.

## Table of Contents

- [Introduction](#introduction)
- [Objectives](#objectives)
- [Architecture Overview](#architecture-overview)
- [Installation](#installation)
- [Database Structure](#database-structure)
- [Code Functionality](#code-functionality)
- [Technical Choices Justification](#technical-choices-justification)
- [Results and Conclusion](#results-and-conclusion)

## Introduction

OCR-Benchmarker aims to identify the most suitable OCR engine in terms of accuracy and speed for different types of documents. It uses Supabase for data storage and provides an intuitive React-based user interface for file upload, result visualization, and detailed analysis.

## Objectives

1. **OCR Engine Benchmarking**: Identify the most suitable engine in terms of accuracy and speed for different document types.
2. **Result Storage**: Use Supabase to store OCR data and associated metadata, facilitating comparisons and future analyses.
3. **User Interface**: Provide an intuitive interface for interacting with OCR data and displaying results.
4. **AI Integration**: Use a text processing model to automatically extract relevant information from OCR results (e.g., quotes).

## Architecture Overview

The application is divided into three main parts:

1. **Backend (FastAPI)**:
   - Processes PDF files and performs OCR analyses
   - Stores results and metadata in Supabase
   - Provides a REST API for frontend interaction

2. **Frontend (React, Next.js)**:
   - Allows file uploads
   - Displays OCR analysis results
   - Provides an interface for detailed document information

3. **Database (Supabase)**:
   - Stores PDF files and JSON results of OCR analyses
   - Maintains KPIs (Key Performance Indicators) for each analysis

### Architecture Diagram

```
+----------------------+          +--------------------+           +------------------+
|      Frontend        | <------> |       Backend      | <-------> |     Supabase     |
| (React, Next.js)     |   API    |   (FastAPI)        |  Storage  | (Database)       |
|                      |          |                    |           |                  |
+----------------------+          +--------------------+           +------------------+
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js and npm
- Supabase account and instance
- Tesseract and Poppler for PDF to image conversion

### Tesseract and Poppler Configuration

1. **Install Tesseract**:
   - Windows: Download Tesseract and configure the path in `pytesseract.pytesseract.tesseract_cmd`.
   - MacOS/Linux: Use a package manager (e.g., `brew install tesseract` on MacOS).

2. **Install Poppler**:
   - Windows: Download Poppler and configure the path.
   - MacOS/Linux: Install via brew or apt.

### Backend Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/JoelaRAS/OCR-Bench.git
   cd OCR-Bench
   ```

2. Create a virtual environment:
   ```bash
   python -m venv ocr-env
   source ocr-env/bin/activate  # Or `ocr-env\Scripts\activate` on Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Launch the backend:
   ```bash
   uvicorn backend.app:app --reload
   ```

### Frontend Deployment

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Access the user interface at `http://localhost:3000` in your browser.

## Database Structure

### Table: pdf_files

| Field                  | Type      | Description                                |
|------------------------|-----------|-------------------------------------------|
| id                     | UUID      | Unique identifier for the PDF file         |
| filename               | TEXT      | Name of the PDF file                       |
| pdf_path               | TEXT      | Path of the PDF file in Supabase storage   |
| easyocr_result_path    | TEXT      | Path of the JSON result for EasyOCR        |
| paddleocr_result_path  | TEXT      | Path of the JSON result for PaddleOCR      |
| tesseract_result_path  | TEXT      | Path of the JSON result for Tesseract      |
| created_at             | TIMESTAMP | Date and time of file import               |

### Table: ocr_kpis

| Field                 | Type      | Description                                |
|-----------------------|-----------|-------------------------------------------|
| id                    | UUID      | Unique identifier for the analysis         |
| filename              | TEXT      | Name of the analyzed PDF file              |
| easyocr_time          | FLOAT     | Processing time for EasyOCR (in seconds)   |
| paddleocr_time        | FLOAT     | Processing time for PaddleOCR (in seconds) |
| tesseract_time        | FLOAT     | Processing time for Tesseract (in seconds) |
| easyocr_word_count    | INTEGER   | Number of words detected by EasyOCR        |
| paddleocr_word_count  | INTEGER   | Number of words detected by PaddleOCR      |
| tesseract_word_count  | INTEGER   | Number of words detected by Tesseract      |
| total_pages           | INTEGER   | Total number of pages in the PDF file      |
| created_at            | TIMESTAMP | Date and time of the analysis              |

## Code Functionality

### PDF File Analysis

1. PDF file is uploaded via the frontend and sent to the backend through a POST request to the `/upload/` route.
2. Backend uses Poppler to convert the PDF to images, then each image is analyzed by the three OCR engines.
3. Results are serialized to JSON and stored on Supabase in the `ocr_files` bucket.
4. Metadata (processing time, word count, etc.) is recorded in the `ocr_kpis` table for comparative analysis.

### Frontend Result Display

1. Results are retrieved from the Supabase database via a SELECT on the `pdf_files` and `ocr_kpis` tables.
2. The user interface uses Tabs to display results from each OCR engine.
3. When a user clicks on a file, results are loaded and displayed in a Dialog.

### Upload and OCR Data Processing

Here's a sample of the code handling file upload and OCR processing:

```python
@app.post("/upload/")
async def upload(file: UploadFile = File(...)):
    try:
        # Save and process the file
        temp_file_path = os.path.join(TEMP_DIR, file.filename)
        with open(temp_file_path, "wb") as temp_file:
            content = await file.read()
            temp_file.write(content)

        # Analyze PDF file with three OCRs and store results
        pdf_file_name = f"pdf/{file.filename}"
        upload_to_supabase('ocr_files', temp_file_path, pdf_file_name)

        # Calculate processing times and store in Supabase
        easyocr_time = time.time() - start_easyocr
        kpi_data = {
            "filename": file.filename,
            "easyocr_time": easyocr_time,
            # ... other KPI data
        }
        insert_kpi_to_supabase('ocr_kpis', kpi_data)

        return JSONResponse(content={"message": "File processed successfully."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
```

## Technical Choices Justification

- **Tesseract**: Robust open-source OCR engine, easy to install and integrate, especially via tesseract.js for frontend use.
- **EasyOCR and PaddleOCR**: Offer accurate results on complex documents, though slower.
- **Supabase**: Easy to set up database with efficient file storage and simple Python integration.

## Results and Conclusion

After testing various documents with different formats and structures, the results show:

- Tesseract is fastest for processing simple documents.
- EasyOCR offers reasonable accuracy but is slower on large files.
- PaddleOCR is most accurate on complex documents but has a high processing time.

### Final Choice: Tesseract

We chose Tesseract for final deployment because it is:

1. **Fast**: Ideal for applications requiring short processing times.
2. **Easy to integrate**: Compatible with JavaScript development environments, making it suitable for frontend use.
3. **Accurate**: While less performant than PaddleOCR on complex documents, it offers sufficient accuracy for common use cases.

### Conclusion

The OCR-Benchmarker project has allowed for an objective comparison of three OCR engines, development of an intuitive interface for file and result management, and construction of a robust database for storing analyses. The technological choices made ensure a good balance between processing speed and result accuracy.



