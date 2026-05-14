import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import * as m from "~/paraglide/messages";
import {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  PlayCircle,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const monthlyData = [
  { name: "Jan", total: 1850 },
  { name: "Feb", total: 2240 },
  { name: "Mar", total: 2890 },
  { name: "Apr", total: 3150 },
  { name: "May", total: 2980 },
  { name: "Jun", total: 3420 },
  { name: "Jul", total: 3680 },
];

const weeklyData = [
  { name: "Mon", total: 180 },
  { name: "Tue", total: 240 },
  { name: "Wed", total: 320 },
  { name: "Thu", total: 280 },
  { name: "Fri", total: 220 },
  { name: "Sat", total: 160 },
  { name: "Sun", total: 140 },
];

export default function DashboardIndex() {
  const stats = [
    {
      title: "Total Students",
      value: "4,567",
      icon: Users,
      description: "Active learners",
    },
    {
      title: "Courses",
      value: "128",
      icon: BookOpen,
      description: "Available courses",
    },
    {
      title: "Lessons",
      value: "2,840",
      icon: GraduationCap,
      description: "Total lessons",
    },
    {
      title: "Certificates",
      value: "1,923",
      icon: Award,
      description: "Awarded certificates",
    },
  ];

  const secondaryStats = [
    {
      title: "Video Lessons",
      value: "1,567",
      icon: PlayCircle,
      description: "Video content",
    },
    {
      title: "Study Hours",
      value: "12,450",
      icon: Clock,
      description: "Total hours logged",
    },
    {
      title: "Reviews",
      value: "3,245",
      icon: Star,
      description: "Course reviews",
    },
    {
      title: "Discussions",
      value: "8,901",
      icon: MessageSquare,
      description: "Forum posts",
    },
    {
      title: "Progress Tracking",
      value: "4,234",
      icon: TrendingUp,
      description: "Active trackers",
    },
    {
      title: "Assessments",
      value: "756",
      icon: Target,
      description: "Total quizzes/tests",
    },
    {
      title: "Assignments",
      value: "1,089",
      icon: Calendar,
      description: "Submitted work",
    },
    {
      title: "Analytics Reports",
      value: "432",
      icon: BarChart3,
      description: "Generated reports",
    },
  ];

  return (
    <main className="flex h-dvh flex-col">

      <div className="space-y-8 p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Student Enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Bar
                    dataKey="total"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Learning Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={weeklyData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="stroke-primary"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {secondaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}