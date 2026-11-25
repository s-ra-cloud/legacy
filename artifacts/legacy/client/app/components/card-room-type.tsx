import { X } from "lucide-react";
import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

interface CardRoomTypeProps {
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  images?: string[];
}

function CardRoomType({
  title,
  description,
  price,
  imageUrl,
  images = [],
}: CardRoomTypeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allImages = [imageUrl, ...images].filter(Boolean);

  return (
    <>
      <div className="block max-w-96 overflow-hidden rounded-md bg-white shadow-md ">
        <div className="relative h-48 w-full overflow-hidden rounded-md p-4 ">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            className="h-full w-full cursor-pointer rounded-md object-cover transition-transform hover:scale-[1.01]"
            onClick={(e) => {
              e.preventDefault();
              setIsModalOpen(true);
            }}
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-2xl text-gray-800 capitalize">
            {title}
          </h3>
          <p className="mt-2 line-clamp-3 text-gray-600">{description}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-bold text-primary-color text-xl">
              {price} DH
            </span>
          </div>
        </div>
      </div>

      {/* Image Carousel Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="font-semibold text-xl">{title}</DialogTitle>
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            type="button"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="mt-2">
            <p className="mb-4 text-gray-600">{description}</p>

            <Carousel className="w-full">
              <CarouselContent>
                {allImages.map((image, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`${title}`}
                        className="h-[300px] w-full rounded-md object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>

            <div className="mt-4 text-right">
              <span className="font-bold text-primary-color text-xl">
                {price} DH
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CardRoomType;
