import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


export function SectionCards() {

  const data = [
    {
      title: "System Name",
      value: "100%",
      badge: {
        text: "Request per minute +5%",
      },
      footer: {
        main: (
          <>
            Ram usage: 70% <IconTrendingUp className="size-4" />
          </>
        ),
        sub: "All systems are running smoothly",
      },
    },
    {
      title: "Database Uptime",
      value: "99.99%",
      badge: {
        text: "Uptime +0.01%",
      },
      footer: {
        main: (
          <>
            Downtime: 0.01% <IconTrendingDown className="size-4" />
          </>
        ),
        sub: "No incidents reported",
      },
    },
    {
      title: "API Response Time",
      value: "200ms",
      badge: {
        text: "Response time -10ms",
      },
      footer: {
        main: (
          <>
            Avg. response time: 220ms <IconTrendingDown className="size-4" />
          </>
        ),
        sub: "Performance is within acceptable range",
      },
    }
  ]
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card mt-5 mx-auto grid grid-cols-1 items-center justify-center gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 text-xl">
      {data.map((item) => (
        <Card key={item.title} className="@container/card text-xl md:w-[50vw]">
          <CardHeader>
            <CardDescription>{item.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {item.value}
            </CardTitle>
          <CardAction className="text-xl">
            <Badge variant="outline">
              <IconTrendingUp />
              {item.badge.text}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start text-xl gap-1.5 ">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {item.footer.main}
          </div>
          <div className="text-muted-foreground">
            {item.footer.sub}
          </div>
        </CardFooter>
      </Card>
      ))}
    </div>
  )
}
