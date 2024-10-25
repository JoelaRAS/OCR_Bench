import { useState } from 'react';
import { supabase } from '../supabaseClient';

const SUPABASE_BASE_URL = 'https://ablkgjbdtdxuqajglwpi.supabase.co/storage/v1/object/public/ocr_files/';

export default function Bench() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState({
    easyocr: [],
    paddleocr: [],
    tesseract: []
  });
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
  };

  const fetchMetadata = async (filename: string) => {
    try {
      const { data, error } = await supabase
        .from('pdf_files')
        .select('pdf_path, easyocr_result_path, paddleocr_result_path, tesseract_result_path')
        .eq('filename', filename)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération des métadonnées:', error);
        throw new Error('Erreur lors de la récupération des métadonnées');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées:', error);
      throw error;
    }
  };

  const fetchJsonContent = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Erreur lors du téléchargement du fichier JSON:', response.statusText);
        throw new Error('Erreur lors du téléchargement du fichier JSON');
      }
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Erreur lors de la lecture du contenu JSON:', error);
      throw error;
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      alert('Veuillez sélectionner un fichier avant de continuer.');
      return;
    }

    setLoading(true);
    const easyocrResults: any[] = [];
    const paddleocrResults: any[] = [];
    const tesseractResults: any[] = [];

    for (let file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        console.log('Sending request to the server...');

        const response = await fetch('http://127.0.0.1:8000/upload/', {
          method: 'POST',
          body: formData,
        });

        console.log(`Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur serveur:', errorText);
          throw new Error('Failed to process the file');
        }

        const result = await response.json();
        console.log('Résultats du serveur:', result);

        // Récupérer les métadonnées depuis Supabase
        const metadata = await fetchMetadata(file.name);

        const easyocrUrl = `${SUPABASE_BASE_URL}${metadata.easyocr_result_path}`;
        const paddleocrUrl = `${SUPABASE_BASE_URL}${metadata.paddleocr_result_path}`;
        const tesseractUrl = `${SUPABASE_BASE_URL}${metadata.tesseract_result_path}`;

        const easyocrJson = await fetchJsonContent(easyocrUrl);
        const paddleocrJson = await fetchJsonContent(paddleocrUrl);
        const tesseractJson = await fetchJsonContent(tesseractUrl);

        easyocrResults.push(...easyocrJson);
        paddleocrResults.push(...paddleocrJson);
        tesseractResults.push(tesseractJson);
      } catch (error) {
        console.error('Erreur lors du traitement du fichier:', error);
        alert('Erreur lors du traitement du fichier: ' + error.message);
      }
    }

    setResults({
      easyocr: easyocrResults,
      paddleocr: paddleocrResults,
      tesseract: tesseractResults,
    });

    // Reset the files after processing
    setFiles([]);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Benchmark OCR</h1>

      <div className="space-y-4">
        <input
          type="file"
          multiple
          accept=".pdf,image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
        />

        <button
          onClick={handleProcess}
          disabled={loading || files.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Traitement en cours...' : 'Envoyer'}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Résultats Tesseract.js</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          {JSON.stringify(results.tesseract, null, 2)}
        </pre>

        <h2 className="text-xl font-semibold">Résultats EasyOCR</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          {JSON.stringify(results.easyocr, null, 2)}
        </pre>

        <h2 className="text-xl font-semibold">Résultats PaddleOCR</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          {JSON.stringify(results.paddleocr, null, 2)}
        </pre>
      </div>
    </div>
  );
}
