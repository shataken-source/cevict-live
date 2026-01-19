import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Mail, Clock, Send } from "lucide-react";

export default function AutomatedEmailSequence() {
  const [sequences, setSequences] = useState([
    { id: 1, name: "Booking Confirmation", delay: 0, active: true },
    { id: 2, name: "Pre-Trip Reminder", delay: 24, active: true },
    { id: 3, name: "Day Before Reminder", delay: 48, active: true },
    { id: 4, name: "Post-Trip Follow-up", delay: 168, active: true },
    { id: 5, name: "Cart Abandonment", delay: 2, active: true },
    { id: 6, name: "Re-engagement (30 days)", delay: 720, active: true },
    { id: 7, name: "Birthday Special", delay: 0, active: true },
    { id: 8, name: "Seasonal Promotion", delay: 0, active: true },
  ]);


  const [selectedSequence, setSelectedSequence] = useState(sequences[0]);
  const [subject, setSubject] = useState("Your Booking Confirmation");
  const [body, setBody] = useState("Thank you for booking with us!");

  const saveSequence = async () => {
    try {
      await supabase.from("email_sequences").upsert({
        id: selectedSequence.id,
        name: selectedSequence.name,
        subject,
        body,
        delay_hours: selectedSequence.delay,
        active: selectedSequence.active,
      });

      toast.success("Email sequence saved!");
    } catch (error: any) {
      toast.error("Failed to save sequence");
    }
  };

  const toggleSequence = (id: number) => {
    setSequences(prev =>
      prev.map(seq => seq.id === id ? { ...seq, active: !seq.active } : seq)
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Email Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sequences.map(seq => (
              <div
                key={seq.id}
                className={`p-3 rounded border cursor-pointer ${
                  selectedSequence.id === seq.id ? "bg-blue-50 border-blue-500" : ""
                }`}
                onClick={() => setSelectedSequence(seq)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium text-sm">{seq.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={seq.active ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSequence(seq.id);
                    }}
                  >
                    {seq.active ? "Active" : "Inactive"}
                  </Button>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>{seq.delay === 0 ? "Immediate" : `${seq.delay}h delay`}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Edit: {selectedSequence.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Subject Line</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email Body</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email content..."
              rows={10}
            />
          </div>
          <Button onClick={saveSequence} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Save Email Sequence
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
