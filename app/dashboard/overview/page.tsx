import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"


export default function Overview() {
  return (
   
        <div className="flex flex-1 flex-col bg-gradient-to-br text-white from-black via-green-950/20 to-black">
          <div className="flex flex-col gap-2 bg-black w-full">
            <div className="flex flex-col gap-4 py-0 md:gap-6 bg-black">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <div className="rounded-xl border border-green-500/20 bg-green-950/50 backdrop-blur-xl p-4">
                  <ChartAreaInteractive />
                </div>
              </div>
            
            </div>
          </div>
        </div>
  )
}
