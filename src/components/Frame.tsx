"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

function LightDirectionCard() {
  const [direction, setDirection] = useState<typeof LIGHT_DIRECTIONS[number]>('ascending');
  const [intensity, setIntensity] = useState(50);
  const [isCasting, setIsCasting] = useState(false);
  const [castResult, setCastResult] = useState('');

  const handleCast = useCallback(async () => {
    try {
      setIsCasting(true);
      setCastResult('');
      
      const result = await sdk.actions.startCast({
        text: `Light direction: ${direction} at ${intensity}% intensity`,
        embeds: [{
          url: `${process.env.NEXT_PUBLIC_URL}/api/light-data`,
          data: {
            direction,
            intensity,
            timestamp: new Date().toISOString()
          }
        }]
      });

      setCastResult(result.success ? 'Cast successful!' : 'Cast failed');
    } catch (error) {
      setCastResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCasting(false);
    }
  }, [direction, intensity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Light Direction Caster</CardTitle>
        <CardDescription>
          Share light direction experiences with the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {LIGHT_DIRECTIONS.map((dir) => (
            <Button
              key={dir}
              variant={direction === dir ? 'default' : 'outline'}
              onClick={() => setDirection(dir)}
            >
              {dir.charAt(0).toUpperCase() + dir.slice(1)}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Intensity: {intensity}%</Label>
          <Slider
            min={MIN_INTENSITY}
            max={MAX_INTENSITY}
            value={[intensity]}
            onValueChange={([value]) => setIntensity(value)}
          />
        </div>

        <Button 
          onClick={handleCast}
          disabled={isCasting}
        >
          {isCasting ? 'Casting...' : 'Cast Light Experience'}
        </Button>

        {castResult && (
          <div className="text-sm text-muted-foreground">
            {castResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        <LightDirectionCard />
      </div>
    </div>
  );
}
