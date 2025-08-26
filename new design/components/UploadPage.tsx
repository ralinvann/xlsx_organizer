import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useState } from "react";

export function UploadPage() {
  const [uploadStep, setUploadStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);

  const steps = [
    {
      number: 1,
      title: "Pilih File Data",
      description: "Upload file Excel atau CSV berisi data kesehatan lansia",
      status: uploadStep > 1 ? "completed" : uploadStep === 1 ? "active" : "pending"
    },
    {
      number: 2,
      title: "Validasi Data",
      description: "Sistem akan memeriksa format dan kelengkapan data",
      status: uploadStep > 2 ? "completed" : uploadStep === 2 ? "active" : "pending"
    },
    {
      number: 3,
      title: "Konfirmasi Import",
      description: "Review data sebelum disimpan ke sistem",
      status: uploadStep > 3 ? "completed" : uploadStep === 3 ? "active" : "pending"
    }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadStep(2);
    
    // Simulate file processing
    setTimeout(() => setUploadStep(3), 2000);
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Upload Document</h2>
        <p className="text-xl text-muted-foreground mt-2">
          Import data kesehatan lansia ke dalam sistem
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Langkah-langkah Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' :
                  step.status === 'active' ? 'bg-primary text-primary-foreground' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-lg text-muted-foreground">{step.description}</p>
                </div>
                <Badge variant={
                  step.status === 'completed' ? 'default' :
                  step.status === 'active' ? 'secondary' :
                  'outline'
                } className="text-sm px-3 py-1">
                  {step.status === 'completed' ? 'Selesai' :
                   step.status === 'active' ? 'Aktif' : 'Menunggu'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Area Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">
                  Seret file ke sini atau klik untuk browse
                </h3>
                <p className="text-lg text-muted-foreground mb-4">
                  Format yang didukung: .xlsx, .csv, .xls (Maksimal 10MB)
                </p>
              </div>
              <Button size="lg" className="h-12 px-8 text-lg">
                <FileText className="w-5 h-5 mr-2" />
                Pilih File
              </Button>
            </div>
          </div>

          {uploadStep > 1 && (
            <div className="mt-6 p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                {uploadStep === 2 ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
                <span className="text-lg">
                  {uploadStep === 2 ? 'Memproses file...' : 'File berhasil divalidasi'}
                </span>
              </div>
            </div>
          )}

          {uploadStep === 3 && (
            <div className="mt-6 flex justify-end">
              <Button size="lg" className="h-12 px-8 text-lg">
                Lanjut ke Preview
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Panduan Format Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xl font-semibold mb-3">Kolom Wajib:</h4>
              <ul className="space-y-2 text-lg">
                <li>• Nama Lengkap</li>
                <li>• Nomor KTP/NIK</li>
                <li>• Tanggal Lahir</li>
                <li>• Alamat</li>
                <li>• Nomor Telepon</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-3">Data Kesehatan:</h4>
              <ul className="space-y-2 text-lg">
                <li>• Tekanan Darah</li>
                <li>• Gula Darah</li>
                <li>• Berat & Tinggi Badan</li>
                <li>• Riwayat Penyakit</li>
                <li>• Obat yang Dikonsumsi</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}