'use client';

import { ArrowRight, CheckCircle2 } from '@/components/ui/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  buttonText: string;
  href: string;
  features: string[];
  buttonVariant?: 'default' | 'outline' | 'ghost';
}

export function ActionCard({
  title,
  description,
  icon,
  gradient,
  buttonText,
  href,
  features,
  buttonVariant = 'default',
}: ActionCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${gradient} border-opacity-50 hover:shadow-xl transition-shadow h-full flex flex-col`}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-full bg-opacity-20 bg-black dark:bg-white">
            {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2 mb-6 text-gray-700 dark:text-gray-300 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className="mt-auto">
          <Button 
            variant={buttonVariant} 
            size="lg" 
            className="w-full mt-4"
          >
            {buttonText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
