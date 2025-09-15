import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookFormValues } from "@/lib/validation/book";
import type { Book } from "@/types";

type BookGenre = Book['genre'];

export function AdditionalSection() {
  const { setValue, watch } = useFormContext<BookFormValues>();
  
  // Watch the tags array and convert it to a string for the input
  const tagsArray = watch("tags") || [];
  const tagsString = tagsArray.join(", ");
  
  // Handle changes to the tags input
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Split by comma and clean up the tags
    const tags = value
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    setValue("tags", tags, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
          {/* Subtitle */}
          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              placeholder="Book&apos;s subtitle"
              {...{ "data-testid": "subtitle" }}
              onChange={(e) => setValue("subtitle", e.target.value)}
              value={watch("subtitle") || ""}
            />
          </div>

          {/* Contributor & Translator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contributor">Contributor</Label>
              <Input
                id="contributor"
                placeholder="Contributor name"
                {...{ "data-testid": "contributor" }}
                onChange={(e) => setValue("contributor", e.target.value)}
                value={watch("contributor") || ""}
              />
            </div>
            <div>
              <Label htmlFor="translator">Translator</Label>
              <Input
                id="translator"
                placeholder="Translator name"
                {...{ "data-testid": "translator" }}
                onChange={(e) => setValue("translator", e.target.value)}
                value={watch("translator") || ""}
              />
            </div>
          </div>

          {/* Genre & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genre">Genre</Label>
              <select
                id="genre"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={watch("genre") || ""}
                onChange={(e) => {
                  const value = e.target.value as BookGenre;
                  setValue("genre", value || null);
                }}
              >
                <option value="FICTION">Fiction</option>
                <option value="NON_FICTION">Non-Fiction</option>
                <option value="SCIENCE_FICTION">Science Fiction</option>
                <option value="FANTASY">Fantasy</option>
                <option value="ROMANCE">Romance</option>
                <option value="THRILLER">Thriller</option>
                <option value="MYSTERY">Mystery</option>
                <option value="HORROR">Horror</option>
                <option value="BIOGRAPHY">Biography</option>
                <option value="HISTORY">History</option>
                <option value="SELF_HELP">Self-Help</option>
                <option value="CHILDREN">Children&apos;s</option>
                <option value="YOUNG_ADULT">Young Adult</option>
                <option value="COOKBOOK">Cookbook</option>
                <option value="TRAVEL">Travel</option>
                <option value="HUMOR">Humor</option>
                <option value="POETRY">Poetry</option>
                <option value="BUSINESS">Business</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="SCIENCE">Science</option>
                <option value="PHILOSOPHY">Philosophy</option>
                <option value="RELIGION">Religion</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="novel, classic, literature"
                value={tagsString}
                onChange={handleTagsChange}
              />
            </div>
          </div>

          {/* Series & Series Index */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="series">Series Name</Label>
              <Input
                id="series"
                placeholder="Series name"
                {...{ "data-testid": "series" }}
                onChange={(e) => setValue("series", e.target.value)}
                value={watch("series") || ""}
              />
            </div>
            <div>
              <Label htmlFor="seriesIndex">Series Number</Label>
              <Input
                id="seriesIndex"
                type="number"
                min="1"
                placeholder="1"
                {...{ "data-testid": "seriesIndex" }}
                onChange={(e) => setValue("seriesIndex", e.target.value ? Number(e.target.value) : null)}
                value={watch("seriesIndex") || ""}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
