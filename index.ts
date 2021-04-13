import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerregistry from "@pulumi/azure-native/containerregistry";
import * as docker from "@pulumi/docker";
import * as web from "@pulumi/azure-native/web";
import { Image } from "@pulumi/azure-native/compute/latest";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("resourceGroup");

const registry = new containerregistry.Registry("registry", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "Basic",
    },
    adminUserEnabled: true,
});

const credentials = pulumi.all([resourceGroup.name, registry.name]).apply(
    ([resourceGroupName, registryName]) => containerregistry.listRegistryCredentials({
        resourceGroupName: resourceGroupName,
        registryName: registryName,
}));
const adminUsername = credentials.apply(credentials => credentials.username!);
const adminPassword = credentials.apply(credentials => credentials.passwords![0].value!);

const customImage = "app";

const appServicePlan = new web.AppServicePlan("plan", {
    resourceGroupName: resourceGroup.name,
    kind: "Linux",
    reserved: true,
    sku: {
        name: "B1",
        tier: "Basic",
    },
});

const image = new docker.Image(customImage, {
    imageName: pulumi.interpolate`${registry.loginServer}/${customImage}:v1.0.0`,
    build: { context: `./${customImage}` },
    registry: {
        server: registry.loginServer,
        username: adminUsername,
        password: adminPassword,
    },
});

const app = new web.WebApp("app", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            {
                name: "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
                value: "false",
            },
            {
                name: "DOCKER_REGISTRY_SERVER_URL",
                value: pulumi.interpolate`https://${registry.loginServer}`,
            },
            {
                name: "DOCKER_REGISTRY_SERVER_USERNAME",
                value: adminUsername,
            },
            {
                name: "DOCKER_REGISTRY_SERVER_PASSWORD",
                value: adminPassword,
            },
            {
                name: "WEBSITES_PORT",
                value: "80", // Our custom image exposes port 80. Adjust for your app as needed.
            },
        ],
        alwaysOn: true,
        linuxFxVersion: pulumi.interpolate`DOCKER|${image.imageName}`,
    },
    httpsOnly: true,
});

export const url = pulumi.interpolate`https://${app.defaultHostName}`;