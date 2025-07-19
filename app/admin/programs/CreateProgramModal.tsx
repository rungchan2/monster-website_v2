"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar as CalendarIcon, MapPin, DollarSign, Users, Clock, Tag, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createProgram, CreateProgramData } from "@/lib/database/programs-server";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "프로그램 제목을 입력해주세요"),
  slug: z.string().min(1, "슬러그를 입력해주세요"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  base_price: z.number().min(0, "기본 가격을 입력해주세요"),
  early_bird_price: z.number().min(0).optional(),
  early_bird_deadline: z.string().optional(),
  max_participants: z.number().min(0).optional(),
  min_participants: z.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  duration_hours: z.number().min(0).optional(),
  instructor_name: z.string().optional(),
  instructor_bio: z.string().optional(),
  instructor_image_url: z.string().url().optional().or(z.literal("")),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  notion_page_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_featured: z.boolean(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProgramModal({ isOpen, onClose, onSuccess }: CreateProgramModalProps) {
  const [loading, setLoading] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [earlyBirdDateOpen, setEarlyBirdDateOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category_id: "",
      base_price: 0,
      early_bird_price: 0,
      early_bird_deadline: "",
      max_participants: 0,
      min_participants: 0,
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      location: "",
      difficulty_level: "beginner",
      duration_hours: 0,
      instructor_name: "",
      instructor_bio: "",
      instructor_image_url: "",
      thumbnail_url: "",
      notion_page_id: "",
      tags: [],
      is_featured: false,
      is_active: true,
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    form.setValue("slug", generateSlug(title));
  };

  const handleTagsChange = (tagString: string) => {
    setTagsInput(tagString);
    const tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag);
    form.setValue("tags", tags);
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) return 0;
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.round(diffHours * 100) / 100; // 소수점 2자리까지
  };

  const watchStartTime = form.watch("start_time");
  const watchEndTime = form.watch("end_time");

  useEffect(() => {
    if (watchStartTime && watchEndTime) {
      const duration = calculateDuration(watchStartTime, watchEndTime);
      form.setValue("duration_hours", duration);
    }
  }, [watchStartTime, watchEndTime, form]);

  const onSubmit = async (data: FormData): Promise<void> => {
    if (loading) return;

    setLoading(true);
    try {
      const createData: CreateProgramData = {
        ...data,
        base_price: data.base_price || 0,
        early_bird_price: data.early_bird_price || undefined,
        max_participants: data.max_participants || undefined,
        min_participants: data.min_participants || undefined,
        duration_hours: data.duration_hours || undefined,
        tags: data.tags || [],
      };

      await createProgram(createData);
      onSuccess();
      onClose();
      form.reset();
      setTagsInput("");
    } catch (error) {
      console.error('Error creating program:', error);
      // 여기서 더 구체적인 에러 처리를 할 수 있습니다
      if (error instanceof Error) {
        form.setError("root", { message: error.message });
      } else {
        form.setError("root", { message: "프로그램 생성에 실패했습니다. 다시 시도해주세요." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined, field: string) => {
    if (date) {
      form.setValue(field as keyof FormData, format(date, "yyyy-MM-dd") as any);
    }
  };

  const TimeSelect = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => {
    return (
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
    );
  };

  const DatePicker = ({ value, onChange, placeholder, open, setOpen }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string;
    open: boolean;
    setOpen: (open: boolean) => void;
  }) => {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), "PPP", { locale: ko }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={20} />
            새 프로그램 만들기
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* 전체 에러 메시지 */}
            {form.formState.errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
              </div>
            )}

            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프로그램 제목 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="프로그램 제목을 입력하세요"
                          {...field}
                          onChange={(e) => handleTitleChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>슬러그 *</FormLabel>
                      <FormControl>
                        <Input placeholder="URL 슬러그" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>프로그램 설명</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent resize-none"
                        placeholder="프로그램에 대한 상세 설명을 입력하세요"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                          {...field}
                        >
                          <option value="">카테고리 선택</option>
                          <option value="team-entrepreneurship">팀기업가정신</option>
                          <option value="squeeze-lrs">SQUEEZE LRS</option>
                          <option value="challenge-trip">챌린지 트립</option>
                          <option value="writer-trip">작가가 되는 트립</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>난이도</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                          {...field}
                        >
                          <option value="beginner">초급</option>
                          <option value="intermediate">중급</option>
                          <option value="advanced">고급</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 일정 및 장소 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon size={20} />
                일정 및 장소
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작일</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="시작일을 선택하세요"
                          open={startDateOpen}
                          setOpen={setStartDateOpen}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료일</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="종료일을 선택하세요"
                          open={endDateOpen}
                          setOpen={setEndDateOpen}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작 시간</FormLabel>
                      <FormControl>
                        <TimeSelect
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="시작 시간"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 시간</FormLabel>
                      <FormControl>
                        <TimeSelect
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="종료 시간"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>총 시간 (시간)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="자동 계산됨"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>장소</FormLabel>
                    <FormControl>
                      <Input placeholder="프로그램 진행 장소" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 참가자 및 가격 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                참가자 및 가격
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>최소 참가자 수</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>최대 참가자 수</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>기본 가격 (원) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="early_bird_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>얼리버드 가격 (원)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="early_bird_deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>얼리버드 마감일</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="얼리버드 마감일"
                          open={earlyBirdDateOpen}
                          setOpen={setEarlyBirdDateOpen}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 강사 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">강사 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="instructor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>강사명</FormLabel>
                      <FormControl>
                        <Input placeholder="강사 이름" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructor_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>강사 프로필 이미지 URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/instructor.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instructor_bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>강사 소개</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent resize-none"
                        placeholder="강사에 대한 소개를 입력하세요"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">추가 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="thumbnail_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>썸네일 이미지 URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/thumbnail.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notion_page_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notion 페이지 ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Notion 페이지 ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>태그 (콤마로 구분)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: 팀워크, 창업, 리더십"
                        value={tagsInput}
                        onChange={(e) => handleTagsChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-[#56007C]/10 text-[#56007C] text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-6">
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 text-[#56007C] border-gray-300 rounded focus:ring-[#56007C]"
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-gray-700">추천 프로그램</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 text-[#56007C] border-gray-300 rounded focus:ring-[#56007C]"
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-gray-700">활성화</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#56007C] hover:bg-[#56007C]/90"
              >
                {loading ? '생성 중...' : '프로그램 생성'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}