import { createRouter, createWebHistory } from "vue-router";
import Home from "../components/Home.vue";
import JoinRoom from "../components/JoinRoom.vue";
import RoomInvite from "../components/RoomInvite.vue";
import VideoCall from "../components/VideoCall.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/join",
    name: "JoinRoom",
    component: JoinRoom,
  },
  {
    path: "/room/:roomId",
    name: "RoomInvite",
    component: RoomInvite,
    props: true,
    beforeEnter: (to, from, next) => {
      // Валидация параметра roomId
      const roomId = to.params.roomId as string;
      if (!roomId || roomId.trim().length < 3) {
        next("/join");
      } else {
        next();
      }
    },
  },
  {
    path: "/call",
    name: "VideoCall",
    component: VideoCall,
    props: (route) => ({
      roomName: route.query.roomName,
      participantName: route.query.participantName,
      token: route.query.token,
    }),
    beforeEnter: (to, from, next) => {
      // Проверяем наличие необходимых параметров
      const { roomName, participantName, token } = to.query;
      if (!roomName || !participantName || !token) {
        next("/");
      } else {
        next();
      }
    },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
