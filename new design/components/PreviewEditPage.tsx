import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { CheckCircle, AlertTriangle, Edit3, Save, X } from "lucide-react";
import { useState } from "react";

export function PreviewEditPage() {
  const [isEditing, setIsEditing] = useState(false);
  
  const sampleData = [
    {
      id: 1,
      nama: "Ibu Siti Aminah",
      nik: "3201234567890123",
      umur: 67,
      tekananDarah: "140/90",
      gulaDarah: "180 mg/dL",
      status: "Perlu Perhatian",
      alamat: "Jl. Mawar No. 15, Jakarta Selatan"
    },
    {
      id: 2,
      nama: "Bapak Ahmad Yusuf",
      nik: "3201234567890124",
      umur: 72,
      tekananDarah: "130/80",
      gulaDarah: "120 mg/dL",
      status: "Normal",
      alamat: "Jl. Melati No. 8, Jakarta Timur"
    },
    {
      id: 3,
      nama: "Ibu Mariam",
      nik: "3201234567890125",
      umur: 65,
      tekananDarah: "120/80",
      gulaDarah: "100 mg/dL",
      status: "Normal",
      alamat: "Jl. Dahlia No. 22, Jakarta Barat"
    }
  ];

  const validationResults = {
    total: 3,
    valid: 2,
    warning: 1,
    error: 0
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Preview and Edit Data</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Review dan edit data sebelum menyimpan ke sistem
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="h-12 px-6 text-lg"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="w-5 h-5 mr-2" />
            {isEditing ? 'Batal Edit' : 'Edit Data'}
          </Button>
          <Button size="lg" className="h-12 px-6 text-lg">
            <Save className="w-5 h-5 mr-2" />
            Simpan ke Sistem
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Hasil Validasi Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{validationResults.total}</div>
              <div className="text-lg text-blue-700">Total Record</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{validationResults.valid}</div>
              <div className="text-lg text-green-700">Valid</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{validationResults.warning}</div>
              <div className="text-lg text-yellow-700">Peringatan</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{validationResults.error}</div>
              <div className="text-lg text-red-700">Error</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Preview Data Kesehatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-lg">Nama</TableHead>
                  <TableHead className="text-lg">NIK</TableHead>
                  <TableHead className="text-lg">Umur</TableHead>
                  <TableHead className="text-lg">Tekanan Darah</TableHead>
                  <TableHead className="text-lg">Gula Darah</TableHead>
                  <TableHead className="text-lg">Status</TableHead>
                  <TableHead className="text-lg">Alamat</TableHead>
                  {isEditing && <TableHead className="text-lg">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleData.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50">
                    <TableCell className="text-lg font-medium">{record.nama}</TableCell>
                    <TableCell className="text-lg">{record.nik}</TableCell>
                    <TableCell className="text-lg">{record.umur}</TableCell>
                    <TableCell className="text-lg">{record.tekananDarah}</TableCell>
                    <TableCell className="text-lg">{record.gulaDarah}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={record.status === "Normal" ? "default" : "destructive"}
                        className="text-sm px-3 py-1"
                      >
                        {record.status === "Normal" ? (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mr-1" />
                        )}
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-lg max-w-xs truncate" title={record.alamat}>
                      {record.alamat}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-8 px-3">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 px-8 text-lg"
            >
              <X className="w-5 h-5 mr-2" />
              Batalkan Import
            </Button>
            <Button size="lg" className="h-12 px-8 text-lg">
              <CheckCircle className="w-5 h-5 mr-2" />
              Konfirmasi & Simpan Data
            </Button>
          </div>
          <div className="text-center mt-4">
            <p className="text-lg text-muted-foreground">
              Data akan disimpan permanen setelah konfirmasi
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}