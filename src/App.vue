<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>The Oak Project</v-app-bar-title>
      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props">
            Cache
          </v-btn>
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-redis">
            <v-list-item-title>Redis</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props">
            Messaging
          </v-btn>
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-bus">
            <v-list-item-title>Service Bus</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-rabbit">
            <v-list-item-title>RabbitMQ</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-apache-kafka">
            <v-list-item-title>Kafka</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-spacer></v-spacer>
      <v-btn icon @click="toggleTheme">
        <v-icon>mdi-theme-light-dark</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <v-container fluid>
        <ServiceBusExplorer />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import ServiceBusExplorer from './components/ServiceBusExplorer.vue'

const theme = useTheme()

function toggleTheme() {
  theme.cycle()
}
</script>

<style>
body {
  font-family: 'Roboto', sans-serif;
}
</style>