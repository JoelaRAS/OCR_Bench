import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ResultsPage = () => {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // const analyzeDevis = async (jsonResult) => {
  //   try {
  //     const response = await fetch('http://127.0.0.1:8000/analyze/', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ json: jsonResult }),
  //     });
  // 
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error('Error during analysis:', errorText);
  //       return `Server error: ${errorText}`;
  //     }
  // 
  //     const data = await response.json();
  //     console.log('Analysis result:', data);
  //     return data.result;
  //   } catch (error) {
  //     console.error('Error during analysis:', error);
  //     return 'Error connecting to the server';
  //   }
  // };

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    const filtered = results.filter((result) =>
      result.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredResults(filtered);
  }, [searchTerm, results]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('pdf_files')
        .select('filename, easyocr_result_path, paddleocr_result_path, tesseract_result_path');
      if (error) {
        console.error('Error fetching results:', error);
      } else {
        setResults(data);
        setFilteredResults(data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const handleCardClick = (result) => {
    setSelectedResult(result);
    setIsDialogOpen(true);
  };

  const fetchJsonContent = async (path) => {
    const url = `https://ablkgjbdtdxuqajglwpi.supabase.co/storage/v1/object/public/ocr_files/${path}`;
    console.log('Fetching JSON content from:', url);
    const response = await fetch(url);
    if (response.ok) {
      const jsonContent = await response.json();
      console.log('Fetched JSON content:', jsonContent);
      return jsonContent;
    } else {
      throw new Error('Error fetching JSON content');
    }
  };

  const loadResultDetails = async () => {
    if (!selectedResult) return;

    try {
      const easyocrJson = await fetchJsonContent(selectedResult.easyocr_result_path);
      const paddleocrJson = await fetchJsonContent(selectedResult.paddleocr_result_path);
      const tesseractJson = await fetchJsonContent(selectedResult.tesseract_result_path);

      // const analysisResult = await analyzeDevis(tesseractJson);

      setSelectedResult({
        ...selectedResult,
        easyocr: easyocrJson,
        paddleocr: paddleocrJson,
        tesseract: tesseractJson,
        // analysisResult,
      });
    } catch (error) {
      console.error('Error loading result details:', error);
    }
  };

  useEffect(() => {
    if (isDialogOpen && selectedResult) {
      loadResultDetails();
    }
  }, [isDialogOpen]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Results</h1>
      <Input
        placeholder="Search for a PDF..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResults.map((result) => (
          <Card key={result.filename} onClick={() => handleCardClick(result)}>
            <CardContent className="cursor-pointer">
              <h3 className="font-bold">{result.filename}</h3>
              <p className="text-sm text-gray-600">Click to see details</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isDialogOpen && selectedResult && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl w-full max-h-[70vh] h-full overflow-y-auto" aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>{selectedResult.filename}</DialogTitle>
            </DialogHeader>
            <div id="dialog-description" className="sr-only">
              OCR analysis details for the selected file, including results from different OCR methods.
            </div>
            <Tabs defaultValue="tesseract" className="w-full">
              <TabsList>
                <TabsTrigger value="tesseract">Tesseract</TabsTrigger>
                <TabsTrigger value="easyocr">EasyOCR</TabsTrigger>
                <TabsTrigger value="paddleocr">PaddleOCR</TabsTrigger>
              </TabsList>
              <TabsContent value="tesseract">
                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto max-h-80 w-full whitespace-pre-wrap">
                  {JSON.stringify(selectedResult.tesseract, null, 2)}
                </pre>
                {/* <h4 className="font-bold mt-4">Devis Analysis:</h4>
                {selectedResult.analysisResult ? (
                  <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto max-h-80">
                    {selectedResult.analysisResult}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-600">No analysis available</p>
                )} */}
              </TabsContent>
              <TabsContent value="easyocr">
                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto max-h-80 w-full whitespace-pre-wrap">
                  {JSON.stringify(selectedResult.easyocr, null, 2)}
                </pre>
              </TabsContent>
              <TabsContent value="paddleocr">
                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto max-h-80 w-full whitespace-pre-wrap">
                  {JSON.stringify(selectedResult.paddleocr, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ResultsPage;
