package in.gamesplanet.safareshahadat;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class SamagamNotifications extends BroadcastReceiver {
 private static final String CHANNEL="safar_samagam_2026_next";
 private static final String URL_DATA="https://gamesplanet13.github.io/Gamesplanet_in/poh-samagam/programs-2026.json";
 private static final int ID=2026;
 private static final String TZ="Asia/Kolkata";

 public static void start(Activity activity) {
  ensureChannel(activity);
  schedule(activity);
  new Thread(()->refresh(activity.getApplicationContext()),"samagam-notification").start();
  if(Build.VERSION.SDK_INT>=33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
    activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},2026);
 }
 @Override public void onReceive(Context context,Intent intent){
  if(intent!=null && "android.intent.action.BOOT_COMPLETED".equals(intent.getAction()))schedule(context);
  final PendingResult pending=goAsync();
  new Thread(()->{try{refresh(context.getApplicationContext());}finally{pending.finish();}},"samagam-notice-refresh").start();
 }
 private static void schedule(Context ctx){
  AlarmManager am=(AlarmManager)ctx.getSystemService(Context.ALARM_SERVICE);
  if(am==null)return;
  Intent it=new Intent(ctx,SamagamNotifications.class).setAction("in.gamesplanet.safareshahadat.REFRESH_NOTIFICATION");
  PendingIntent pi=PendingIntent.getBroadcast(ctx,ID,it,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  long interval=AlarmManager.INTERVAL_FIFTEEN_MINUTES;
  am.setInexactRepeating(AlarmManager.RTC_WAKEUP,System.currentTimeMillis()+interval,interval,pi);
 }
 private static void ensureChannel(Context ctx){
  if(Build.VERSION.SDK_INT>=26){
   NotificationManager nm=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
   if(nm==null)return;
   NotificationChannel channel=new NotificationChannel(CHANNEL,"Upcoming Safar-e-Shahadat Samagam",NotificationManager.IMPORTANCE_LOW);
   channel.setDescription("Current and next program schedule");channel.setShowBadge(false);
   nm.createNotificationChannel(channel);
  }
 }
 private static JSONObject fetch() throws Exception {
  HttpURLConnection c=(HttpURLConnection)new URL(URL_DATA).openConnection();
  c.setConnectTimeout(8000);c.setReadTimeout(9000);c.setUseCaches(false);
  try{
   if(c.getResponseCode()!=200)throw new IllegalStateException("Schedule unavailable");
   ByteArrayOutputStream b=new ByteArrayOutputStream();
   try(InputStream in=c.getInputStream()){
    byte[] buf=new byte[4096];int n;
    while((n=in.read(buf))!=-1){if(b.size()+n>200000)throw new IllegalStateException("Schedule too big");b.write(buf,0,n);}
   }
   return new JSONObject(b.toString("UTF-8"));
  }finally{c.disconnect();}
 }
 static void refresh(Context ctx){
  try{
   JSONObject data=fetch();
   String content=data.toString();
   ctx.getSharedPreferences("samagam_notice",Context.MODE_PRIVATE).edit().putString("last",content).apply();
   display(ctx,data);
  }catch(Exception ex){
   String cached=ctx.getSharedPreferences("samagam_notice",Context.MODE_PRIVATE).getString("last","");
   if(!cached.isEmpty())try{display(ctx,new JSONObject(cached));}catch(Exception ignored){}
  }
 }
 private static long dateMs(String yyyyMMdd,String hhmm){
  try{
   SimpleDateFormat fmt=new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.US);
   fmt.setTimeZone(TimeZone.getTimeZone(TZ));fmt.setLenient(false);
   Date date=fmt.parse(yyyyMMdd+" "+hhmm);
   return date==null?0:date.getTime();
  }catch(Exception err){return 0;}
 }
 private static long endMs(JSONObject p,long start){
  final String date=p.optString("date","");
  final String name=p.optString("timeNote","");
  // Known timetable from 2026 poster, including late-night overnight programs.
  if(name.contains("10:00 PM–3:00 AM"))return dateMs(nextDate(date),"03:00");
  if(name.contains("2:30–6:00 AM")||name.contains("3:00–6:00 AM"))return dateMs(date,"06:00");
  if(name.contains("11:00 AM–3:00 PM"))return dateMs(date,"15:00");
  if(name.contains("9:00–10:30 PM"))return dateMs(date,"22:30");
  if(name.contains("8:00–11:00 PM"))return dateMs(date,"23:00");
  if(name.contains("9:00–11:00 PM"))return dateMs(date,"23:00");
  // No verified event time: use today's calendar date rather than inventing hours.
  if(p.optString("time","").isEmpty())return dateMs(nextDate(date),"00:00");
  return start+2*60*60*1000L;
 }
 private static String nextDate(String date){
  try{
   SimpleDateFormat fmt=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
   fmt.setTimeZone(TimeZone.getTimeZone(TZ));fmt.setLenient(false);
   Calendar c=Calendar.getInstance(TimeZone.getTimeZone(TZ));c.setTime(fmt.parse(date));c.add(Calendar.DATE,1);
   return fmt.format(c.getTime());
  }catch(Exception e){return date;}
 }
 private static void display(Context ctx,JSONObject data){
  JSONArray rows=data.optJSONArray("programs");if(rows==null)return;
  long now=System.currentTimeMillis();JSONObject current=null,next=null;long currentStart=Long.MAX_VALUE,nextStart=Long.MAX_VALUE;
  for(int i=0;i<rows.length();i++){
   JSONObject p=rows.optJSONObject(i);if(p==null)continue;
   String date=p.optString("date",""),clock=p.optString("time","");
   long start=dateMs(date,clock.isEmpty()?"00:00":clock);if(start==0)continue;
   long end=endMs(p,start);
   if(now>=start && now<end && start<currentStart){current=p;currentStart=start;}
   else if(start>now && start<nextStart){next=p;nextStart=start;}
  }
  JSONObject chosen=current!=null?current:next;
  NotificationManager nm=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
  if(nm==null)return;
  if(chosen==null){nm.cancel(ID);return;}
  if(Build.VERSION.SDK_INT>=33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
  ensureChannel(ctx);
  String heading=current!=null?"ਅੱਜ ਦਾ ਸਮਾਗਮ · Today's Samagam":"ਅਗਲਾ ਸਮਾਗਮ · Next Samagam";
  String title=chosen.optString("titlePa",chosen.optString("titleEn","Safar-e-Shahadat 2026"));
  String detail=chosen.optString("date","")+" · "+chosen.optString("timeNote","");
  Intent open=new Intent(ctx,MainActivity.class);
  open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  PendingIntent pi=PendingIntent.getActivity(ctx,ID,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(ctx,CHANNEL):new Notification.Builder(ctx);
  Notification note=builder.setSmallIcon(android.R.drawable.ic_popup_reminder)
   .setContentTitle(heading).setContentText(title).setStyle(new Notification.BigTextStyle().bigText(title+"\n"+detail))
   .setSubText(detail).setContentIntent(pi).setOnlyAlertOnce(true).setOngoing(true).setAutoCancel(false)
   .setShowWhen(false).build();
  nm.notify(ID,note);
 }
}
