"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { Clock, QrCode, Download } from "lucide-react";
import { getAttendanceLogs, getBranchQRCodes, generateBranchQR } from "../actions";
import { getBranches } from "../../actions";
import { formatDateTime, calculateHours } from "@/lib/utils";
import type { Branch } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AttendanceWithRelations {
  id: string; employee_id: string; branch_id: string; check_in: string; check_out: string | null;
  is_auto_checkout: boolean;
  profiles: { full_name: string; full_name_ar: string | null; email: string } | null;
  branches: { name: string; name_ar: string | null } | null;
}

interface QRWithBranch {
  id: string; branch_id: string; qr_token: string; is_active: boolean;
  branches: { name: string; name_ar: string | null } | null;
}

export default function AttendancePage() {
  const { isRTL, locale } = useLocale();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AttendanceWithRelations[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [qrCodes, setQRCodes] = useState<QRWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showQR, setShowQR] = useState<QRWithBranch | null>(null);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const filters: { branch_id?: string; date_from?: string; date_to?: string } = {};
      if (filterBranch) filters.branch_id = filterBranch;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      const [logsData, brs, qrs] = await Promise.all([
        getAttendanceLogs(tenantId, filters),
        getBranches(tenantId),
        getBranchQRCodes(tenantId),
      ]);
      setLogs((logsData || []) as unknown as AttendanceWithRelations[]);
      setBranches(brs || []);
      setQRCodes((qrs || []) as unknown as QRWithBranch[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId, filterBranch, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateQR = async (branchId: string) => {
    if (!tenantId) return;
    setGeneratingQR(branchId);
    try {
      await generateBranchQR(tenantId, branchId);
      load();
    } catch (err) { console.error(err); }
    finally { setGeneratingQR(null); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Attendance" titleAr="الحضور والانصراف" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* QR Codes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {isRTL ? "رموز QR للفروع" : "Branch QR Codes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {branches.map(branch => {
                const qr = qrCodes.find(q => q.branch_id === branch.id && q.is_active);
                return (
                  <div key={branch.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{isRTL ? branch.name_ar || branch.name : branch.name}</p>
                      <p className="text-xs text-muted-foreground">{qr ? (isRTL ? "رمز QR متوفر" : "QR Active") : (isRTL ? "بدون QR" : "No QR")}</p>
                    </div>
                    <div className="flex gap-2">
                      {qr && (
                        <Button variant="outline" size="sm" onClick={() => setShowQR(qr)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleGenerateQR(branch.id)} isLoading={generatingQR === branch.id}>
                        {qr ? (isRTL ? "تجديد" : "Renew") : (isRTL ? "إنشاء" : "Generate")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">{isRTL ? "الفرع" : "Branch"}</Label>
            <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
              options={[{ value: "", label: isRTL ? "الكل" : "All" }, ...branches.map(b => ({ value: b.id, label: isRTL ? b.name_ar || b.name : b.name }))]} className="w-44" />
          </div>
          <div className="space-y-1"><Label className="text-xs">{isRTL ? "من" : "From"}</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
          <div className="space-y-1"><Label className="text-xs">{isRTL ? "إلى" : "To"}</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
        </div>

        {/* Attendance Table */}
        <Card>
          {loading ? (
            <CardContent className="p-12 text-center"><div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" /></CardContent>
          ) : logs.length === 0 ? (
            <CardContent className="p-12 text-center"><Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">{isRTL ? "لا توجد سجلات" : "No records"}</p></CardContent>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "الموظف" : "Employee"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "تسجيل الدخول" : "Check In"}</TableHead>
                <TableHead>{isRTL ? "تسجيل الخروج" : "Check Out"}</TableHead>
                <TableHead>{isRTL ? "الساعات" : "Hours"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} className="animate-fade-in">
                    <TableCell><div><p className="font-medium">{log.profiles?.full_name}</p><p className="text-xs text-muted-foreground">{log.profiles?.email}</p></div></TableCell>
                    <TableCell>{isRTL ? log.branches?.name_ar || log.branches?.name : log.branches?.name}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(log.check_in, locale)}</TableCell>
                    <TableCell className="text-sm">{log.check_out ? formatDateTime(log.check_out, locale) : <Badge variant="warning">{isRTL ? "لم يسجل خروج" : "Still In"}</Badge>}</TableCell>
                    <TableCell className="font-mono">{log.check_out ? `${calculateHours(log.check_in, log.check_out)}h` : "—"}</TableCell>
                    <TableCell>{log.is_auto_checkout ? <Badge variant="info">{isRTL ? "تلقائي" : "Auto"}</Badge> : <Badge variant="outline">{isRTL ? "يدوي" : "Manual"}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
        <DialogContent onClose={() => setShowQR(null)} className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{isRTL ? "رمز QR للفرع" : "Branch QR Code"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{isRTL ? showQR?.branches?.name_ar || showQR?.branches?.name : showQR?.branches?.name}</p>
          <div className="flex justify-center p-6 bg-white rounded-xl">
            {showQR && <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/attendance/scan?token=${showQR.qr_token}`} size={200} />}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{isRTL ? "امسح الرمز لتسجيل الدخول/الخروج" : "Scan to check in/out"}</p>
          <Button variant="outline" className="mt-2" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />{isRTL ? "طباعة" : "Print"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
