
"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { jsPDF } from "jspdf"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Link from "next/link"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  User,
  MapPin,
  Briefcase,
  Heart,
  PawPrint,
  Users,
  CloudSun,
  Calendar,
  Globe,
  Car,
  UserIcon,
  Tag,
  Clock,
  Baby,
  Edit,
  Info,
  FileText,
  Download,
  RotateCcw,
  CheckCircle,
  Video,
  ChevronDown,
  ChevronUp,
  Target,
  History,
  Mountain as Hiking,
  CloudRain,
  Sparkles,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"


interface FormData {
  // Model Details
  purpose: string
  fullName: string
  location: string
  previousLocation: string
  work: string
  divorce: string
  pet: string
  kids: string
  weather: string
  parents: string
  plans: string
  ethnicity: string
  car: string

  // Client Details
  clientName: string
  clientLocation: string
  clientWork: string
  hobbies: string
  clientkid: string
  clientnickname: string
  clientweekend: string
  clientweather: string

  // Topics
  beforeCall: string
  afterCall: string
  kidLocation: string
  remarks: string
}

const initialFormData: FormData = {
  // Model Details
  purpose: "",
  fullName: "",
  location: "",
  work: "",
  kids: "",
  previousLocation: "",
  divorce: "",
  pet: "",
  weather: "",
  parents: "",
  plans: "",
  ethnicity: "",
  car: "",

  // Client Details
  clientName: "",
  clientLocation: "",
  clientWork: "",
  clientnickname: "",
  clientweather: "",
  hobbies: "",
  clientkid: "",
  clientweekend: "",

  // Topics
  beforeCall: "",
  afterCall: "",
  kidLocation: "",
  remarks: "",
}

const requiredFields: (keyof FormData)[] = [
  "purpose",
  "fullName",
  "location",
  "work",
  "kids",
  "clientName",
  "clientLocation",
  "clientWork",
  "clientnickname",
  "clientweather",
  "beforeCall",
  "afterCall",
  "kidLocation",
  "remarks",
]

const sections = [
    {
      id: "model",
      title: "Model Details",
      icon: <User className="h-5 w-5 text-white" />,
      requiredFields: ["purpose", "fullName", "location", "work", "kids"],
      optionalFields: ["previousLocation", "divorce", "pet", "ethnicity", "car", "weather", "parents", "plans"],
    },
    {
      id: "client",
      title: "Client Details",
      icon: <UserIcon className="h-5 w-5 text-white" />,
      requiredFields: ["clientName", "clientLocation", "clientWork", "clientnickname", "clientweather"],
      optionalFields: ["hobbies", "clientkid", "clientweekend"],
    },
    {
      id: "topics",
      title: "Topics to Discuss",
      icon: <FileText className="h-5 w-5 text-foreground" />,
      requiredFields: ["beforeCall", "afterCall", "kidLocation", "remarks"],
      optionalFields: [],
    },
]

export default function VideoCallTemplatePage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isMounted, setIsMounted] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    model: true,
    client: false,
    topics: false,
  })
  const [progress, setProgress] = useState(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const pdfRef = useRef<HTMLIFrameElement>(null)

  const isAuthenticityCall = formData.purpose.toLowerCase().includes("authenticity")


  useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
        const docRef = doc(db, "singleDocs", "videoCallFormData");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setFormData(docSnap.data() as FormData);
        }
    }
    loadData().catch(err => console.error("Failed to load form data from Firestore", err));
  }, []);

  const getFieldsToCheck = useCallback(() => {
    let fieldsToCheck: (keyof FormData)[] = [...requiredFields]
    if (isAuthenticityCall) {
      const modelOptional = sections.find(s => s.id === 'model')?.optionalFields ?? [];
      const clientOptional = sections.find(s => s.id === 'client')?.optionalFields ?? [];
      const optionalFieldsToExclude = [...modelOptional, ...clientOptional] as (keyof FormData)[];
      fieldsToCheck = fieldsToCheck.filter(f => !optionalFieldsToExclude.includes(f));
    }
    return fieldsToCheck;
  }, [isAuthenticityCall]);
  
  const updateProgress = useCallback(() => {
    const fieldsToCheck = getFieldsToCheck();
    const totalFields = fieldsToCheck.length
    const filledFields = fieldsToCheck.filter((field) => formData[field as keyof FormData]?.trim() !== "").length
    setProgress(totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0);
  }, [formData, getFieldsToCheck]);

  useEffect(() => {
    if (isMounted) {
        updateProgress();
        const saveData = async () => {
            try {
                await setDoc(doc(db, "singleDocs", "videoCallFormData"), formData);
            } catch (error) {
                console.error("Failed to save form data to Firestore", error);
            }
        };
        const timer = setTimeout(saveData, 500); // Debounce saving
        return () => clearTimeout(timer);
    }
  }, [formData, isMounted, updateProgress]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, []);

  const setAuthenticityPurpose = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      purpose: "Authenticity",
    }));
    toast({
        title: "Purpose Updated",
        description: "The purpose of the call has been set to 'Authenticity'.",
    })
  }, [toast]);

  const isSectionComplete = useCallback((sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return false
    
    let required = section.requiredFields as (keyof FormData)[];
    
    if (isAuthenticityCall) {
        const optional = section.optionalFields as (keyof FormData)[];
        required = required.filter(f => !optional.includes(f))
    }

    return required.every((field) => formData[field]?.trim() !== "")
  }, [formData, isAuthenticityCall]);

  const isFormValid = useCallback(() => {
    const fieldsToCheck = getFieldsToCheck();
    return fieldsToCheck.every((field) => formData[field as keyof FormData]?.trim() !== "")
  }, [formData, getFieldsToCheck]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }, []);

  const generatePDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.width;
    const margin = 15;
    const contentW = pageW - margin * 2;
    const labelWidth = 60;
    const valueWidth = contentW - labelWidth - 5;
    let y = 15;

    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > 280) {
        doc.addPage();
        y = 20;
      }
    };
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Video Call Details", pageW / 2, y, { align: "center" });
    y += 8;
    
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
    const formattedDate = now.toLocaleDateString("en-US", options);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Generated on: ${formattedDate}`, pageW / 2, y, { align: "center" });
    y += 15;

    const addSection = (title: string, data: { label: string; value: string }[]) => {
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, y);
      y += 2;
      doc.setDrawColor(230);
      doc.line(margin, y, margin + contentW, y);
      y += 6;

      data.forEach(item => {
        if (!item.value || item.value === "N/A") return;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const labelLines = doc.splitTextToSize(item.label, labelWidth);
        
        doc.setFont("helvetica", "normal");
        const valueLines = doc.splitTextToSize(item.value, valueWidth);
        
        const lineHeight = Math.max(labelLines.length, valueLines.length) * 5;
        checkPageBreak(lineHeight + 4);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(labelLines, margin, y);

        doc.setFont("helvetica", "normal");
        doc.text(valueLines, margin + labelWidth + 5, y);

        y += lineHeight;
        y += 2;
        doc.setDrawColor(245);
        doc.line(margin, y, margin + contentW, y);
        y+=2;
      });
      y += 5;
    };
    
    const modelData = [
        { label: "Purpose of Call:", value: formData["purpose"] || "N/A" },
        { label: "Full Name / Age:", value: formData["fullName"] || "N/A" },
        { label: "Current Location:", value: formData["location"] || "N/A" },
        !isAuthenticityCall && { label: "Previous Location:", value: formData["previousLocation"] || "N/A" },
        { label: "Occupation:", value: formData["work"] || "N/A" },
        !isAuthenticityCall && { label: "Relationship Status:", value: formData["divorce"] || "N/A" },
        !isAuthenticityCall && { label: "Pet Details:", value: formData["pet"] || "N/A" },
        { label: "Children Details:", value: formData["kids"] || "N/A" },
        !isAuthenticityCall && { label: "Current Weather & Time:", value: formData["weather"] || "N/A" },
        !isAuthenticityCall && { label: "Parent Details:", value: formData["parents"] || "N/A" },
        !isAuthenticityCall && { label: "Weekend Plans:", value: formData["plans"] || "N/A" },
        !isAuthenticityCall && { label: "Ethnicity:", value: formData["ethnicity"] || "N/A" },
        !isAuthenticityCall && { label: "Vehicle Details:", value: formData["car"] || "N/A" },
    ].filter(Boolean) as { label: string; value: string }[]

    addSection("Model Details", modelData);

    const clientData = [
      { label: "Full Name / Age:", value: formData["clientName"] || "N/A" },
      { label: "Location:", value: formData["clientLocation"] || "N/A" },
      { label: "Occupation:", value: formData["clientWork"] || "N/A" },
      !isAuthenticityCall && { label: "Hobbies:", value: formData["hobbies"] || "N/A" },
      !isAuthenticityCall && { label: "Children Details:", value: formData["clientkid"] || "N/A" },
      { label: "Nickname:", value: formData["clientnickname"] || "N/A" },
      !isAuthenticityCall && { label: "Weekend Plans:", value: formData["clientweekend"] || "N/A" },
      { label: "Weather and Time:", value: formData["clientweather"] || "N/A" },
    ].filter(Boolean) as { label: string; value: string }[];
    
    addSection("Client Details", clientData)

    const topicsData = [
      { label: "What you do before the call?:", value: formData["beforeCall"] || "N/A" },
      { label: "What will you do after the call?:", value: formData["afterCall"] || "N/A" },
      { label: "Where is your Child?:", value: formData["kidLocation"] || "N/A" },
      { label: "Additional Topics:", value: formData["remarks"] || "N/A" },
    ]
    addSection("Topics to Discuss", topicsData);

    const pdfDataUrl = doc.output("datauristring")
    setPdfUrl(pdfDataUrl)
  }, [formData, isAuthenticityCall]);

  const handleGeneratePdf = useCallback(() => {
    if (!isFormValid()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before generating the PDF.",
        variant: "destructive",
      })

      for (const section of sections) {
        if (!isSectionComplete(section.id)) {
          setExpandedSections((prev) => ({
            ...prev,
            [section.id]: true,
          }))
          break
        }
      }
      return
    }

    setIsLoading(true)
    setIsDialogOpen(true)

    setTimeout(() => {
      generatePDF()
      setIsLoading(false)
    }, 1000)
  }, [isFormValid, isSectionComplete, generatePDF, toast]);

  const handleDownloadPdf = useCallback(() => {
    if (!pdfUrl) return
    const link = document.createElement("a")
    link.href = pdfUrl
    const clientName = formData.clientName.replace(/ /g, '_') || 'Details';
    link.download = `VideoCall_${clientName}_${new Date().toISOString().substring(0,10)}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "PDF Downloaded",
      description: "Your video call information has been downloaded successfully.",
    })
  }, [pdfUrl, formData.clientName, toast]);

  const handleReset = useCallback(async () => {
    if (confirm("Are you sure you want to reset the form? All data will be lost from the database.")) {
      setFormData(initialFormData)
      try {
        await setDoc(doc(db, "singleDocs", "videoCallFormData"), initialFormData);
        setPdfUrl(null)
        setExpandedSections({ model: true, client: false, topics: false })
        toast({ title: "Form Reset", description: "All form data has been cleared from the database." })
      } catch (error) {
        console.error("Failed to reset form data in Firestore", error);
        toast({ title: "Error", description: "Failed to reset form data.", variant: "destructive"})
      }
    }
  }, [toast]);

  const renderFormField = useCallback((
    name: keyof FormData,
    label: string,
    icon: React.ReactNode,
    required = false,
    placeholder = "",
    helpText = "",
    tooltip = "",
    hideForAuthenticity = false,
  ) => {
    if (!isMounted) return null; // Don't render on the server
    const isCompleted = formData[name]?.trim() !== ""
    if (isAuthenticityCall && hideForAuthenticity) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center">
          <label htmlFor={name} className="text-sm font-medium flex items-center gap-1">
            {label}
            {required && <Badge variant="destructive" className="text-[10px] py-0">Required</Badge>}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1" />
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">{tooltip}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
          <Input id={name} name={name} value={formData[name]} onChange={handleInputChange} className="pl-10" placeholder={placeholder} required={required} />
          {isCompleted && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
        </div>
        {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      </div>
    )
  }, [formData, handleInputChange, isMounted, isAuthenticityCall]);
  
  const renderTextareaField = useCallback((
    name: keyof FormData,
    label: string,
    icon: React.ReactNode,
    required = false,
    placeholder = "",
    helpText = "",
  ) => {
    if (!isMounted) return null; // Don't render on the server
    return(
        <div className="space-y-2 md:col-span-2">
            <label htmlFor="remarks" className="text-sm font-medium flex items-center gap-1">
                {label}
                {required && <Badge variant="destructive" className="text-[10px] py-0">Required</Badge>}
            </label>
            <div className="relative">
                <div className="absolute left-3 top-3 text-muted-foreground">{icon}</div>
                <Textarea id={name} name={name} value={formData[name as keyof FormData]} onChange={handleInputChange} className="pl-10 min-h-[100px]" placeholder={placeholder} required={required}/>
            </div>
            {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        </div>
    )
  }, [formData, handleInputChange, isMounted]);
  
  if (!isMounted) {
    return null; // Or a loading spinner
  }

  const isAgent = user?.role === 'Agent';

  return (
    <div className="w-full h-full">
        <div className="flex justify-between items-center mb-6">
            <div>
            <h1 className="text-3xl font-bold text-foreground">Videocall Template</h1>
            <p className="text-muted-foreground mt-1">
                Fill the form and generate a PDF for the video call.
            </p>
            </div>
            {isAgent && (
                <Button asChild variant="outline">
                    <Link href="/profile">
                        <UserIcon className="mr-2 h-4 w-4" /> Back to Profile
                    </Link>
                </Button>
            )}
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Call Information</CardTitle>
                <CardDescription>
                    Fill in the details for the model and client to generate a summary sheet.
                </CardDescription>
                <div className="pt-4">
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        {progress === 100 ? (
                        <span className="text-green-600 flex items-center justify-center gap-1">
                            <CheckCircle className="h-3 w-3" /> All required fields completed!
                        </span>
                        ) : (
                        `${progress}% complete`
                        )}
                    </p>
                </div>
            </CardHeader>
            <CardContent className="p-6">
            <div className="space-y-4">
                {/* Model Details Section */}
                <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer bg-muted/50" onClick={() => toggleSection("model")}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <h2 className="text-lg font-semibold">Model Details</h2>
                            <Badge variant={isSectionComplete("model") ? "default" : "secondary"}>
                                {isSectionComplete("model") ? "Complete" : "Incomplete"}
                            </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                            {expandedSections.model ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CardHeader>
                    {expandedSections.model && (
                        <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                    <div className="sm:col-span-2">
                                        {renderFormField("purpose", "Purpose of Call", <Target className="h-4 w-4" />, true, "E.g., Authenticity")}
                                    </div>
                                    <Button onClick={setAuthenticityPurpose} variant="outline" className="w-full sm:w-auto">
                                        <Sparkles className="mr-2 h-4 w-4" /> Authenticity
                                    </Button>
                                </div>
                            </div>
                            {renderFormField("fullName", "Full Name / Age", <User className="h-4 w-4" />, true, "E.g., Jane Smith / 30", "Format: Name / Age")}
                            {renderFormField("location", "Current Location", <MapPin className="h-4 w-4" />, true, "E.g., Makati (5 years)", "", "Include city/area and how many years you've lived there")}
                            {renderFormField("previousLocation", "Previous Location", <History className="h-4 w-4" />, false, "E.g., Manila", "", "", true)}
                            {renderFormField("work", "Occupation", <Briefcase className="h-4 w-4" />, true, "E.g., Executive Assistant")}
                            {renderFormField("divorce", "Relationship Status", <Heart className="h-4 w-4" />, false, "E.g., Separated since 2022 (2 years)", "If applicable, include when and for how long", "", true)}
                            {renderFormField("pet", "Pet Details", <PawPrint className="h-4 w-4" />, false, "E.g., Dog / Max / 3 years old", "Type, name, age (or 'None' if not applicable)", "", true)}
                            {renderFormField("kids", "Children Details", <Baby className="h-4 w-4" />, true, "E.g., Sofia / 8 / ABC School / Grade 3", "Names, ages, schools, grades (or 'NA' if not applicable)")}
                            {renderFormField("weather", "Current Weather & Time", <CloudSun className="h-4 w-4" />, false, "E.g., Sunny, 3:45 PM", "", "", true)}
                            {renderFormField("parents", "Parent Details", <Users className="h-4 w-4" />, false, "E.g., Mother (62, retired), Father (deceased)", "Just put N/A if not mentioned", "", true)}
                            {renderFormField("plans", "Weekend Plans", <Calendar className="h-4 w-4" />, false, "E.g., Beach trip with friends", "", "", true)}
                            {renderFormField("ethnicity", "Ethnicity", <Globe className="h-4 w-4" />, false, "E.g., Filipina Taiwanese", "", "", true)}
                            {renderFormField("car", "Vehicle Details", <Car className="h-4 w-4" />, false, "E.g., Toyota Corolla 2020", "Make, model, year (or 'None' if not applicable)", "", true)}
                        </div>
                        </CardContent>
                    )}
                </Card>

                {/* Client Details Section */}
                 <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer bg-muted/50" onClick={() => toggleSection("client")}>
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <h2 className="text-lg font-semibold">Client Details</h2>
                            <Badge variant={isSectionComplete("client") ? "default" : "secondary"}>
                                {isSectionComplete("client") ? "Complete" : "Incomplete"}
                            </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                            {expandedSections.client ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CardHeader>
                    {expandedSections.client && (
                        <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderFormField("clientName", "Full Name and Age", <UserIcon className="h-4 w-4" />, true, "E.g., John Doe / 32")}
                            {renderFormField("clientLocation", "Location", <MapPin className="h-4 w-4" />, true, "E.g., New York")}
                            {renderFormField("clientWork", "Occupation", <Briefcase className="h-4 w-4" />, true, "E.g., Marketing Manager")}
                            {renderFormField("hobbies", "Hobbies", <Hiking className="h-4 w-4" />, false, "E.g., Hiking, Travel", "Enter 'None' if not applicable", "", true)}
                            {renderFormField("clientkid", "Children Details", <Baby className="h-4 w-4" />, false, "E.g., Lily / 3", "Names and ages (or 'None' if not applicable)", "", true)}
                            {renderFormField("clientnickname", "Nickname", <Tag className="h-4 w-4" />, true, "E.g., Johnny", "Enter 'None' if not applicable")}
                            {renderFormField("clientweekend", "Weekend Plans", <Calendar className="h-4 w-4" />, false, "E.g., Fishing trip", "Enter 'None' if not applicable", "", true)}
                            {renderFormField("clientweather", "Weather and Time", <CloudRain className="h-4 w-4" />, true, "E.g., Rainy, 10:30 AM", "Based on client's location")}
                        </div>
                        </CardContent>
                    )}
                </Card>

                {/* Topics Section */}
                 <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer bg-muted/50" onClick={() => toggleSection("topics")}>
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <h2 className="text-lg font-semibold">Topics to Discuss</h2>
                             <Badge variant={isSectionComplete("topics") ? "default" : "secondary"}>
                                {isSectionComplete("topics") ? "Complete" : "Incomplete"}
                            </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                            {expandedSections.topics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CardHeader>

                    {expandedSections.topics && (
                        <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderFormField("beforeCall", "What are you doing before Video Call?", <Clock className="h-4 w-4" />, true, "E.g., Preparing lunch", "", "Activities you were doing just before the video call")}
                            {renderFormField("afterCall", "What will you do after the Call?", <Clock className="h-4 w-4" />, true, "E.g., Going to the mall", "", "What you plan to do after finishing the video call")}
                            {renderFormField("kidLocation", "Where is your child right now, and what is she doing?", <Baby className="h-4 w-4" />, true, "E.g., At school", "Asan ung Anak mo at ano ung Ginagawa nya?")}
                            {renderTextareaField("remarks", "Additional Topics", <Edit className="h-4 w-4" />, true, "Specific topics you'd like to discuss with your client... (Required)", "Ilagay nyo dito ung gusto nyo I highlight sa Tawag.")}
                        </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
                <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset Form
                </Button>
                <Button onClick={handleGeneratePdf} disabled={!isFormValid()}>
                <FileText className="mr-2 h-4 w-4" /> Generate PDF
                </Button>
            </div>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" /> PDF Preview
                </DialogTitle>
                <DialogDescription>
                Preview your generated PDF. Rename the file with the client's name when downloading.
                </DialogDescription>
            </DialogHeader>

            <div className="relative min-h-[60vh] bg-muted/50 rounded-md overflow-hidden border-2 border-dashed">
                {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                    <p className="text-sm font-medium text-primary">Generating your document...</p>
                </div>
                ) : pdfUrl ? (
                <iframe ref={pdfRef} src={pdfUrl} className="w-full h-[60vh]" title="PDF Preview" frameBorder="0" />
                ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">PDF preview will appear here</p>
                </div>
                )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Information
                </Button>
                <Button onClick={handleDownloadPdf} disabled={!pdfUrl || isLoading}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}

    