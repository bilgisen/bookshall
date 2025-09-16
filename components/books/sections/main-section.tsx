import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookFormValues } from "@/lib/validation/book";

export function MainSection() {
  const { register, formState: { errors } } = useFormContext<BookFormValues>();

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
          {/* Book Title */}
          <div>
            <Label htmlFor="title" className="text-accent-foreground/30 py-2">Book Title*</Label>
            <Input
              id="title"
              placeholder="Enter book title"
              {...register("title")}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Author */}
          <div>
            <Label htmlFor="author" className="text-accent-foreground/30 py-2">Author*</Label>
            <Input
              id="author"
              placeholder="Enter author name"
              {...register("author")}
              className={errors.author ? 'border-red-500' : ''}
            />
            {errors.author && (
              <p className="text-sm text-red-500 mt-1">{errors.author.message}</p>
            )}
          </div>

          {/* Publisher & Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="publisher" className="text-accent-foreground/30 py-2">Publisher*</Label>
              <Input
                id="publisher"
                placeholder="Publisher name"
                {...register("publisher")}
              />
            </div>
            <div>
              <Label htmlFor="publisherWebsite" className="text-accent-foreground/30 py-2">Publisher Website</Label>
              <Input
                id="publisherWebsite"
                type="url"
                placeholder="https://example.com"
                {...register("publisherWebsite")}
              />
            </div>
          </div>

          {/* ISBN, Language, Year */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="isbn" className="text-accent-foreground/30 py-2">ISBN</Label>
              <Input
                id="isbn"
                placeholder="ISBN number"
                {...register("isbn")}
              />
            </div>
            <div>
              <Label htmlFor="language" className="text-accent-foreground/30 py-2">Language*</Label>
              <select
                id="language"
                {...register("language")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="en">English</option>
                <option value="tr">Turkish</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="publishYear" className="text-accent-foreground/30 py-2">Publication Year</Label>
              <Input
                id="publishYear"
                type="number"
                min="1000"
                max={new Date().getFullYear() + 1}
                placeholder={new Date().getFullYear().toString()}
                defaultValue={new Date().getFullYear()}
                {...register("publishYear", {
                  valueAsNumber: true,
                  validate: (value) => {
                    if (value === undefined || value === null) return true;
                    const year = Number(value);
                    return (
                      (year >= 1000 && year <= new Date().getFullYear() + 1) ||
                      "Please enter a valid year between 1000 and " + (new Date().getFullYear() + 1)
                    );
                  },
                })}
              />
              {errors.publishYear && (
                <p className="text-sm text-red-500 mt-1">{errors.publishYear.message as string}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-accent-foreground/30 py-2">Description</Label>
            <Textarea
              id="description"
              placeholder="Book description"
              rows={5}
              {...register("description")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
