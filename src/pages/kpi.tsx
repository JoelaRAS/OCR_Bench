import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';

const KPIPage = () => {
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    const fetchKPIs = async () => {
      const { data, error } = await supabase
        .from('ocr_kpis')
        .select('*');

      if (error) {
        console.error('Erreur lors de la récupération des KPIs:', error);
      } else {
        setKpis(data || []);
      }
    };

    fetchKPIs();
  }, []);

  // Préparer les données pour les graphiques
  const processingTimeData = kpis.map(kpi => ({
    name: kpi.filename,
    EasyOCR: kpi.easyocr_time,
    PaddleOCR: kpi.paddleocr_time,
    Tesseract: kpi.tesseract_time,
  }));

  const wordCountData = kpis.map(kpi => ({
    name: kpi.filename,
    EasyOCR: kpi.easyocr_word_count,
    PaddleOCR: kpi.paddleocr_word_count,
    Tesseract: kpi.tesseract_word_count,
  }));

  const totalPagesData = kpis.map(kpi => ({
    name: kpi.filename,
    Pages: kpi.total_pages,
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">KPIs</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Temps de traitement (en secondes)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processingTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="EasyOCR" fill="#8884d8" />
              <Bar dataKey="PaddleOCR" fill="#82ca9d" />
              <Bar dataKey="Tesseract" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Nombre de mots détectés</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wordCountData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="EasyOCR" fill="#8884d8" />
              <Bar dataKey="PaddleOCR" fill="#82ca9d" />
              <Bar dataKey="Tesseract" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nombre total de pages</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={totalPagesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Pages" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default KPIPage;
